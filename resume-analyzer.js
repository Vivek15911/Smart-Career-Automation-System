// ATS Resume Analyzer Logic

document.addEventListener('DOMContentLoaded', () => {
    // initAuth() is handled by the script tag in HTML

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('resume-upload');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const clearJdBtn = document.getElementById('clear-jd-btn');
    const jdText = document.getElementById('jd-text');
    const analyzeBtn = document.getElementById('analyze-btn');
    let currentFile = null;

    // --- Drag & Drop Handlers ---

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // Handle file selection via button
    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });

    jdText.addEventListener('input', () => {
        updateAnalyzeButton();
        toggleClearJdBtn();
    });

    clearJdBtn.addEventListener('click', () => {
        jdText.value = '';
        toggleClearJdBtn();
        updateAnalyzeButton();
        document.getElementById('results-section').style.display = 'none';
    });

    function toggleClearJdBtn() {
        clearJdBtn.style.display = jdText.value.trim().length > 0 ? 'flex' : 'none';
    }

    function handleFiles(files) {
        if (files.length > 0) {
            validateAndPreview(files[0]);
        }
    }

    function validateAndPreview(file) {
        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        // Basic extension check as fallback
        if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
            alert('Please upload a PDF or DOCX file.');
            return;
        }

        currentFile = file;
        fileName.textContent = file.name;

        // Show file info and hide drop zone text/inputs
        // We'll hide the children of dropZone to keep the layout, or just toggle visibility
        // Based on HTML structure, they are separate.
        // dropZone is the big dashed area. fileInfo is the small bar below or replacing it?
        // Looking at HTML, they are siblings in 'analyzer-card upload-card'.
        // If we want to SWAP them, we should toggle their display.

        dropZone.style.display = 'none';
        fileInfo.style.display = 'flex';

        updateAnalyzeButton();
    }

    // Expose clearFile to global scope (or attach listener if we remove onclick)
    window.clearFile = function () {
        currentFile = null;
        fileInput.value = '';

        dropZone.style.display = 'flex';
        fileInfo.style.display = 'none';

        updateAnalyzeButton();
    };

    function updateAnalyzeButton() {
        // Need to ensure elements exist
        if (analyzeBtn && jdText) {
            analyzeBtn.disabled = !(currentFile && jdText.value.trim().length > 10);
        }
    }

    // ... (existing helper functions)

    analyzeBtn.addEventListener('click', async () => {
        if (!currentFile || !jdText.value.trim()) return;

        analyzeBtn.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;

        try {
            const resumeText = await extractText(currentFile);
            const analysisResults = analyzeResume(resumeText, jdText.value);

            // Render Results
            renderResults(analysisResults);

            // Save to Database
            await saveAnalysisToHistory(currentFile.name, analysisResults);

            // Refresh History
            loadHistory();

            analyzeBtn.textContent = 'Analyze Resume';
            analyzeBtn.disabled = false;
        } catch (error) {
            console.error('Analysis failed:', error);
            alert('Failed to analyze resume. Please try again.');
            analyzeBtn.textContent = 'Analyze Resume';
            analyzeBtn.disabled = false;
        }
    });


    // --- Text Extraction Logic ---

    async function extractText(file) {
        const fileType = file.type;
        if (fileType === 'application/pdf') {
            return await extractPdfText(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return await extractDocxText(file);
        } else if (fileType === 'text/plain') {
            return await file.text();
        } else {
            // Fallback strategy: try based on extension if type is missing or generic
            if (file.name.endsWith('.pdf')) {
                return await extractPdfText(file);
            } else if (file.name.endsWith('.docx')) {
                return await extractDocxText(file);
            }
            throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
        }
    }

    async function extractPdfText(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str);
                text += strings.join(' ') + '\n';
            }
            return text;
        } catch (error) {
            console.error('PDF Extraction Error:', error);
            throw new Error('Failed to parse PDF file.');
        }
    }

    async function extractDocxText(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            return result.value;
        } catch (error) {
            console.error('DOCX Extraction Error:', error);
            throw new Error('Failed to parse DOCX file.');
        }
    }


    // Enhanced Analysis Logic
    function analyzeResume(resumeText, jobDescription) {
        const cleanResume = resumeText.toLowerCase();
        const cleanJD = jobDescription.toLowerCase();

        // 1. Keyword Extraction (Tech & General)
        const commonTechTerms = [
            'javascript', 'typescript', 'react', 'angular', 'vue', 'node.js', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'sql', 'mysql', 'postgresql', 'mongodb', 'aws', 'azure', 'docker', 'kubernetes', 'jenkins', 'git', 'agile', 'scrum', 'html', 'css', 'sass', 'less', 'webpack', 'babel', 'rest api', 'graphql', 'machine learning', 'ai', 'data science', 'analytics', 'seo', 'sem', 'marketing', 'sales', 'management', 'leadership', 'communication', 'problem solving', 'teamwork'
        ];

        let doc = nlp(jobDescription);
        let terms = doc.nouns().out('array');

        const stopWords = [
            'experience', 'years', 'work', 'job', 'role', 'team', 'company', 'candidate', 'skills', 'requirements', 'responsibilities', 'description', 'qualification', 'ability', 'knowledge', 'understanding', 'proficiency', 'opportunity', 'environment', 'degree', 'bachelor', 'master', 'applicant', 'position', 'employment', 'status', 'gender', 'race', 'religion', 'orientation', 'disability', 'veteran', 'accommodation', 'apply', 'contact', 'salary', 'benefits', 'location', 'type', 'full-time', 'part-time', 'contract', 'remote', 'hybrid', 'onsite',
            'solutions', 'systems', 'applications', 'services', 'clients', 'users', 'needs', 'support', 'issues', 'problems', 'projects', 'tasks', 'duties', 'area', 'field', 'industry', 'sector', 'market', 'business', 'organization', 'firm', 'agency', 'bureau', 'office', 'department', 'division', 'unit', 'branch', 'section', 'group', 'crew', 'staff', 'personnel', 'workforce', 'employees', 'workers', 'members', 'colleagues', 'peers', 'associates', 'partners', 'collaborators', 'managers', 'supervisors', 'leaders', 'directors', 'executives', 'officers', 'administrators', 'coordinators', 'planners', 'organizers', 'developers', 'engineers', 'architects', 'designers', 'analysts', 'consultants', 'advisors', 'specialists', 'experts', 'professionals', 'practitioners', 'technicians', 'operators', 'assistants', 'helpers', 'aides', 'clerks', 'secretaries', 'receptionists', 'attendants', 'trainees', 'interns', 'apprentices', 'students', 'graduates', 'recruits', 'hires',
            'strong', 'excellent', 'good', 'great', 'proven', 'track', 'record', 'demonstrated', 'proficient', 'understanding', 'hands-on', 'successful', 'detail', 'oriented', 'communication', 'interpersonal', 'verbal', 'written', 'command', 'fluent', 'native', 'bilingual', 'trilingual', 'multilingual', 'willingness', 'flexible', 'adaptable', 'reliable', 'dependable', 'punctual', 'motivated', 'driven', 'passionate', 'enthusiastic', 'energetic', 'proactive', 'initiative', 'independent', 'collaborative', 'cooperative', 'creative', 'innovative', 'analytical', 'critical', 'thinking', 'problem-solving', 'decision-making', 'time', 'management', 'organizational', 'prioritization', 'multi-tasking', 'leadership', 'mentorship', 'supervision', 'coaching', 'training', 'development', 'continuous', 'improvement', 'quality', 'assurance', 'control', 'compliance', 'standards', 'procedures', 'processes', 'policies', 'regulations', 'guidelines', 'protocols', 'methodologies', 'frameworks', 'tools', 'technologies', 'platforms', 'languages', 'operating', 'software', 'hardware', 'equipment', 'instruments', 'devices', 'machinery', 'vehicles', 'materials', 'supplies', 'resources', 'budget', 'finance', 'accounting', 'marketing', 'sales', 'customer', 'service', 'client', 'relations', 'stakeholders', 'vendors', 'suppliers', 'partners', 'investors', 'shareholders', 'board', 'committees', 'task'
        ];

        let techKeywords = commonTechTerms.filter(term => cleanJD.includes(term));
        let otherKeywords = terms.map(t => t.toLowerCase().replace(/^[.,]+|[.,]+$/g, '').trim())
            .filter(t => t.length > 4 && !stopWords.includes(t) && !commonTechTerms.includes(t) && !t.match(/^\d+$/) && !t.includes('.'));

        // Remove duplicates and limit generic keywords
        otherKeywords = [...new Set(otherKeywords)];

        // Final Keywords List (Unique)
        // Prioritize tech keywords, then take top 10 other keywords
        let keywords = [...new Set([...techKeywords, ...otherKeywords.slice(0, 10)])];

        // 2. Calculate Matches
        if (keywords.length === 0) return createEmptyResult();

        let matched = [];
        let missing = [];

        keywords.forEach(keyword => {
            if (cleanResume.includes(keyword)) {
                matched.push(keyword);
            } else {
                missing.push(keyword);
            }
        });

        const keywordScore = Math.round((matched.length / keywords.length) * 100);

        // 3. Experience Relevance (Heuristic: Look for years + keywords)
        // Basic check: does resume mention "years" or dates close to matched keywords?
        // Simpler approach: If high keyword match, assume experience is relevant.
        // Bonus for "years", "experienced", "senior", "lead"
        let experienceScore = 50; // Base
        if (cleanResume.includes('years') || cleanResume.includes('experience')) experienceScore += 10;
        if (cleanResume.includes('senior') || cleanResume.includes('lead') || cleanResume.includes('manager')) experienceScore += 10;
        if (keywordScore > 50) experienceScore += 20;
        if (keywordScore > 75) experienceScore += 10;
        experienceScore = Math.min(100, experienceScore);

        // 4. Keyword Density (Basic: Count total matched keyword occurrences vs total words approx)
        // A "good" density is naturally around 2-5% for key terms, but we'll score relative to a healthy range.
        const totalWords = cleanResume.split(/\s+/).length;
        const matchedCount = matched.reduce((acc, k) => acc + (cleanResume.match(new RegExp(k, 'g')) || []).length, 0);
        const density = (matchedCount / totalWords) * 100;

        // Score: Optimal density ~2-3%. If density > 0.5% give good score.
        let densityScore = Math.min(100, Math.round((density / 2) * 100));
        if (densityScore < 30 && keywordScore > 50) densityScore = 50; // Boost if coverage is good but volume is low

        // 5. Formatting (Mock - usually requires improved parser)
        const formatScore = 95; // Default high for readable text

        // 6. Skills Match (Weighted by Tech terms)
        let skillScore = keywordScore;
        if (techKeywords.length > 0) {
            const matchedTech = techKeywords.filter(t => cleanResume.includes(t));
            skillScore = Math.round((matchedTech.length / techKeywords.length) * 100);
        }

        // Final Weighted Score
        const finalScore = Math.round(
            (keywordScore * 0.35) +
            (skillScore * 0.30) +
            (experienceScore * 0.20) +
            (formatScore * 0.10) +
            (densityScore * 0.05)
        );

        return {
            score: finalScore,
            keywordScore,
            skillScore,
            formatScore,
            experienceScore,
            densityScore,
            matched,
            missing,
            jobTitle: 'Analyzed Position' // could be extracted in future
        };
    }

    function createEmptyResult() {
        return { score: 0, keywordScore: 0, skillScore: 0, formatScore: 100, experienceScore: 0, densityScore: 0, matched: [], missing: [], jobTitle: 'Unknown' };
    }

    // Render Results
    function renderResults(results) {
        document.getElementById('results-section').style.display = 'block';

        // Main Gage
        animateValue('score-text', 0, results.score, 1500);
        document.getElementById('score-circle-path').style.strokeDasharray = `${results.score}, 100`;

        // Color coding
        const circle = document.getElementById('score-circle-path');
        circle.classList.remove('score-low', 'score-medium', 'score-high');
        if (results.score < 50) circle.classList.add('score-low');
        else if (results.score < 80) circle.classList.add('score-medium');
        else circle.classList.add('score-high');

        // Metrics Bars
        updateMetric('skills', results.skillScore);
        updateMetric('format', results.formatScore);
        updateMetric('experience', results.experienceScore);
        updateMetric('density', results.densityScore);

        // Keywords
        renderTags('matched-keywords', results.matched, 'tag-matched');
        renderTags('missing-keywords', results.missing, 'tag-missing');

        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
    }

    function updateMetric(id, value) {
        document.getElementById(`${id}-score-val`).textContent = `${value}%`;
        document.getElementById(`${id}-score-bar`).style.width = `${value}%`;

        // Color bar
        const bar = document.getElementById(`${id}-score-bar`);
        bar.style.backgroundColor = value < 50 ? '#ef4444' : value < 80 ? '#f59e0b' : '#22c55e';
    }

    function renderTags(containerId, tags, className) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (tags.length === 0) {
            container.innerHTML = '<span class="text-gray-500 text-sm">None found</span>';
            return;
        }
        tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = `tag ${className}`;
            span.textContent = tag;
            container.appendChild(span);
        });
    }

    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start) + '%';
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // --- History / Supabase Integration ---

    async function saveAnalysisToHistory(fileName, results) {
        if (!supabaseClient || !currentUser) return;

        try {
            const { error } = await supabaseClient
                .from('resume_analyses')
                .insert({
                    user_id: currentUser.id,
                    resume_name: fileName,
                    job_title: "Job Analysis", // Placeholder
                    total_score: results.score,
                    section_scores: {
                        keywords: results.keywordScore,
                        skills: results.skillScore,
                        formatting: results.formatScore,
                        experience: results.experienceScore,
                        density: results.densityScore
                    },
                    analysis_results: {
                        matched: results.matched,
                        missing: results.missing
                    }
                });

            if (error) throw error;
            console.log("Analysis saved to history");
        } catch (err) {
            console.error("Error saving history:", err);
        }
    }

    async function loadHistory() {
        if (!supabaseClient || !currentUser) return;

        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        try {
            const { data, error } = await supabaseClient
                .from('resume_analyses')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            if (data.length === 0) {
                historyList.innerHTML = '<div class="empty-state">No recent scans found.</div>';
                return;
            }

            historyList.innerHTML = data.map(item => `
                <div class="history-item">
                    <div class="history-info">
                        <strong>${item.resume_name}</strong>
                        <span class="date">${new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="history-score ${getScoreClass(item.total_score)}">
                        ${item.total_score}%
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error("Error loading history:", err);
            historyList.innerHTML = '<div class="error-state">Failed to load history</div>';
        }
    }

    function getScoreClass(score) {
        if (score >= 80) return 'score-high-text';
        if (score >= 50) return 'score-medium-text';
        return 'score-low-text';
    }

    // Call history on load if auth is ready (or waiting for it)
    setTimeout(loadHistory, 2000);
});
