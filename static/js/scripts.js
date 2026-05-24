const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'research', 'projects', 'awards', 'Intership']

window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    }

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

    // Yaml config
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    document.getElementById(key).innerHTML = yml[key];
                } catch {
                    console.log("Unknown id and value: " + key + "," + yml[key].toString())
                }
            })
        })
        .catch(error => console.log(error));

    // Marked - load markdown sections (home, awards, internship)
    marked.use({ mangle: false, headerIds: false })
    section_names.forEach((name) => {
        // Skip research & projects - handled by JSON renderers
        if (name === 'research' || name === 'projects') return;

        fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                document.getElementById(name + '-md').innerHTML = html;
            }).then(() => {
                MathJax.typeset();
            })
            .catch(error => console.log(error));
    })

    // === Shared helper: highlight author name ===
    function highlightAuthor(authors) {
        return authors.replace(/\b(Chujie\s*W\.?|Chujie\s*Wang|ChuJie\s*Wang)\b/gi,
            '<strong>Chujie Wang</strong>');
    }

    // === Shared helper: render image slots ===
    function renderImageSlots(images, prefix) {
        if (!images || images.length === 0) {
            images = ['', '', ''];
        }
        return images.map((img, i) => {
            if (img) {
                return `<div class="${prefix}-image-slot has-image" data-index="${i}">
                    <img src="${img}" alt="Figure ${i + 1}" loading="lazy">
                </div>`;
            }
            return `<div class="${prefix}-image-slot" data-index="${i}" title="Click to add image">
                <i class="bi bi-image"></i>
            </div>`;
        }).join('');
    }

    // === Shared helper: render links ===
    function renderLinks(links, prefix) {
        if (!links || links.length === 0) return '';
        return `<div class="${prefix}-card-links">` + links.map(l => {
            const text = l.text || l.url || 'Link';
            const icon = l.icon || 'bi-link-45deg';
            return `<a class="${prefix}-card-link" href="${l.url || '#'}" target="_blank" rel="noopener">
                <i class="bi ${icon}"></i> ${escapeHtml(text)}
            </a>`;
        }).join('') + '</div>';
    }

    // ================================================================
    // === RESEARCH: Load JSON and render cards ===
    // ================================================================
    let researchData = { economic: [], ai: [] };
    let currentCategory = 'economic';

    function renderAbstract(abstract, index) {
        const hasContent = abstract && abstract.trim().length > 0;
        return `
        <div class="pub-abstract" data-paper="${index}">
            <div class="pub-abstract-header" onclick="this.parentElement.classList.toggle('open')">
                <span class="pub-abstract-label">
                    <i class="bi bi-journal-text"></i> Abstract
                </span>
                <span class="pub-abstract-toggle"><i class="bi bi-chevron-down"></i></span>
            </div>
            <div class="pub-abstract-body">
                <div class="pub-abstract-content">
                    ${hasContent
                        ? `<p>${abstract}</p>`
                        : `<textarea placeholder="Add abstract here..." rows="3"></textarea>`
                    }
                </div>
            </div>
        </div>`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderResearchCard(paper, index) {
        try {
            const statusLabel = paper.statusClass === 'under-review' ? 'Under Review' :
                               paper.statusClass === 'published' ? paper.status :
                               (paper.status || '');
            const authors = paper.authors || '';
            const title = paper.title || 'Untitled';
            const journal = paper.journal || '';
            const images = paper.images || ['', '', ''];
            const links = paper.links || [];
            const abstract = paper.abstract || '';

            let venueHtml = '';
            if (paper.status && paper.statusClass !== 'published' && paper.statusClass !== 'under-review') {
                venueHtml = `<div class="pub-card-venue"><i class="bi bi-geo-alt"></i>&nbsp; ${escapeHtml(paper.status)}</div>`;
            }

            return `
            <div class="pub-card">
                <div class="pub-card-header">
                    <span class="pub-card-title">${escapeHtml(title)}</span>
                    <span class="pub-card-status status-${paper.statusClass || 'working'}">${escapeHtml(statusLabel)}</span>
                </div>
                <div class="pub-card-authors">${highlightAuthor(authors)}</div>
                <div class="pub-card-journal">
                    <i class="bi bi-journal-bookmark-fill"></i>&nbsp; ${escapeHtml(journal)}
                </div>
                ${venueHtml}
                <div class="pub-image-gallery">
                    ${renderImageSlots(images, 'pub')}
                </div>
                ${renderAbstract(abstract, index)}
                ${renderLinks(links, 'pub')}
            </div>`;
        } catch (e) {
            console.error('Error rendering research card', index, paper, e);
            return `<div class="pub-card" style="border-left-color:#e74c3c;"><p>Error rendering: ${escapeHtml(paper.title || 'Unknown')}</p></div>`;
        }
    }

    function renderResearch(category) {
        try {
            const container = document.getElementById('research-md');
            if (!container) {
                console.error('research-md container not found');
                return;
            }
            const papers = researchData[category] || [];

            if (papers.length === 0) {
                container.innerHTML = `
                    <div class="pub-empty">
                        <i class="bi bi-inbox"></i>
                        <p>No papers in this category yet.</p>
                    </div>`;
                return;
            }

            const countHtml = `<div class="pub-count">${papers.length} paper${papers.length > 1 ? 's' : ''}</div>`;
            const cardsHtml = papers.map((p, i) => renderResearchCard(p, i)).join('');
            container.innerHTML = countHtml + cardsHtml;

            if (typeof MathJax !== 'undefined' && typeof MathJax.typeset === 'function') {
                MathJax.typeset([container]);
            }
        } catch (e) {
            console.error('Error rendering research:', e);
        }
    }

    function setupToggleButtons() {
        const buttons = document.querySelectorAll('.pub-toggle-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', function () {
                buttons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                renderResearch(currentCategory);
            });
        });
    }

    // Load research data
    fetch(content_dir + 'Research.json')
        .then(response => response.json())
        .then(data => {
            researchData = data;
            setupToggleButtons();
            renderResearch(currentCategory);
        })
        .catch(error => {
            console.log('Research JSON load error:', error);
            document.getElementById('research-md').innerHTML =
                '<div class="pub-empty"><i class="bi bi-exclamation-triangle"></i><p>Failed to load research.</p></div>';
        });

    // ================================================================
    // === PROJECTS: Load JSON and render cards ===
    // ================================================================

    function renderVideoSlot(video) {
        if (!video || video.trim() === '') {
            return `
            <div class="project-video-slot">
                <div class="project-video-placeholder" title="Add a video URL (YouTube, Bilibili, or direct video link)">
                    <i class="bi bi-play-btn"></i>
                    <span>Add demo video (YouTube / Bilibili / MP4)</span>
                </div>
            </div>`;
        }

        // YouTube embed
        const ytMatch = video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) {
            return `
            <div class="project-video-slot has-video">
                <iframe src="https://www.youtube.com/embed/${ytMatch[1]}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen title="Project Demo Video"></iframe>
            </div>`;
        }

        // Bilibili embed
        const blMatch = video.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+|av\d+)/);
        if (blMatch) {
            const bvid = blMatch[1].startsWith('BV') ? blMatch[1] : null;
            const aid = blMatch[1].startsWith('av') ? blMatch[1].slice(2) : null;
            const embedSrc = bvid
                ? `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1`
                : `https://player.bilibili.com/player.html?aid=${aid}&page=1&high_quality=1`;
            return `
            <div class="project-video-slot has-video">
                <iframe src="${embedSrc}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen title="Project Demo Video" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
            </div>`;
        }

        // Direct video file (MP4, WebM, etc.)
        if (video.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || video.startsWith('static/')) {
            return `
            <div class="project-video-slot has-video">
                <video controls preload="metadata" title="Project Demo Video">
                    <source src="${video}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>`;
        }

        // Fallback: treat as a link
        return `
        <div class="project-video-slot has-video">
            <div class="project-video-placeholder" style="flex-direction:row; gap:1rem;">
                <i class="bi bi-box-arrow-up-right"></i>
                <span>Open: <a href="${video}" target="_blank" rel="noopener">${video}</a></span>
            </div>
        </div>`;
    }

    function renderTechTags(technologies) {
        if (!technologies || technologies.length === 0) return '';
        return '<div class="project-tech-tags">' +
            technologies.map(t => `<span class="project-tech-tag">${t}</span>`).join('') +
            '</div>';
    }

    function renderProjectCard(project, index) {
        try {
            const title = project.title || 'Untitled';
            const description = project.description || '';
            const status = project.status || project.statusClass || '';
            const statusClass = project.statusClass || 'working';
            const technologies = project.technologies || [];
            const images = project.images || ['', '', ''];
            const links = project.links || [];
            const video = project.video || '';

            return `
            <div class="project-card">
                <div class="project-card-header">
                    <span class="project-card-title">${escapeHtml(title)}</span>
                    ${status ? `<span class="pub-card-status status-${statusClass}">${escapeHtml(status)}</span>` : ''}
                </div>
                ${renderTechTags(technologies)}
                <div class="project-description">
                    <div class="project-description-label">
                        <i class="bi bi-info-circle"></i> Overview
                    </div>
                    ${escapeHtml(description)}
                </div>
                ${renderVideoSlot(video)}
                <div class="project-image-gallery">
                    ${renderImageSlots(images, 'project')}
                </div>
                ${renderLinks(links, 'project')}
            </div>`;
        } catch (e) {
            console.error('Error rendering project card', index, project, e);
            return `<div class="project-card" style="border-left-color:#e74c3c;"><p>Error rendering: ${escapeHtml(project.title || 'Unknown')}</p></div>`;
        }
    }

    function renderProjects() {
        const container = document.getElementById('projects-md');
        if (!container) {
            console.error('projects-md container not found');
            return;
        }

        fetch(content_dir + 'projects.json')
            .then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(data => {
                const projects = data.projects || [];
                if (projects.length === 0) {
                    container.innerHTML = `
                        <div class="pub-empty">
                            <i class="bi bi-inbox"></i>
                            <p>No projects yet.</p>
                        </div>`;
                    return;
                }
                const countHtml = `<div class="pub-count">${projects.length} project${projects.length > 1 ? 's' : ''}</div>`;
                const cardsHtml = projects.map((p, i) => renderProjectCard(p, i)).join('');
                container.innerHTML = countHtml + cardsHtml;

                if (typeof MathJax !== 'undefined' && typeof MathJax.typeset === 'function') {
                    MathJax.typeset([container]);
                }
            })
            .catch(error => {
                console.error('Projects load error:', error);
                const pc = document.getElementById('projects-md');
                if (pc) pc.innerHTML =
                    '<div class="pub-empty"><i class="bi bi-exclamation-triangle"></i><p>Failed to load projects: ' + escapeHtml(error.message) + '</p></div>';
            });
    }

    // Load projects
    renderProjects();

});
