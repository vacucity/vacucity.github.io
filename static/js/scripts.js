const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'publications', 'awards', 'Intership']

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
        // Skip publications - handled by JSON renderer
        if (name === 'publications') return;

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

    // === Publications: Load JSON and render cards ===
    let publicationsData = { economic: [], ai: [] };
    let currentCategory = 'economic';

    function highlightAuthor(authors) {
        return authors.replace(/\b(Chujie\s*W\.?|Chujie\s*Wang|ChuJie\s*Wang)\b/gi,
            '<strong>Chujie Wang</strong>');
    }

    function renderImageSlots(images) {
        if (!images || images.length === 0) {
            images = ['', '', ''];
        }
        return images.map((img, i) => {
            if (img) {
                return `<div class="pub-image-slot has-image" data-index="${i}">
                    <img src="${img}" alt="Figure ${i + 1}" loading="lazy">
                </div>`;
            }
            return `<div class="pub-image-slot" data-index="${i}" title="Click to add image">
                <i class="bi bi-image"></i>
            </div>`;
        }).join('');
    }

    function renderLinks(links) {
        if (!links || links.length === 0) return '';
        return '<div class="pub-card-links">' + links.map(l =>
            `<a class="pub-card-link" href="${l.url}" target="_blank" rel="noopener">
                <i class="bi bi-link-45deg"></i> ${l.text}
            </a>`
        ).join('') + '</div>';
    }

    function renderAbstract(abstract, paperIndex) {
        const hasContent = abstract && abstract.trim().length > 0;
        return `
        <div class="pub-abstract" data-paper="${paperIndex}">
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

    function renderPubCard(paper, index) {
        const statusLabel = paper.statusClass === 'under-review' ? 'Under Review' :
                           paper.statusClass === 'published' ? paper.status :
                           paper.status;
        return `
        <div class="pub-card">
            <div class="pub-card-header">
                <span class="pub-card-title">${paper.title}</span>
                <span class="pub-card-status status-${paper.statusClass}">${statusLabel}</span>
            </div>
            <div class="pub-card-authors">${highlightAuthor(paper.authors)}</div>
            <div class="pub-card-journal">
                <i class="bi bi-journal-bookmark-fill"></i>&nbsp; ${paper.journal}
            </div>
            ${paper.status && paper.statusClass !== 'published' && paper.statusClass !== 'under-review'
                ? `<div class="pub-card-venue"><i class="bi bi-geo-alt"></i>&nbsp; ${paper.status}</div>`
                : ''}
            <div class="pub-image-gallery">
                ${renderImageSlots(paper.images)}
            </div>
            ${renderAbstract(paper.abstract, index)}
            ${renderLinks(paper.links)}
        </div>`;
    }

    function renderPublications(category) {
        const container = document.getElementById('publications-md');
        const papers = publicationsData[category] || [];

        if (papers.length === 0) {
            container.innerHTML = `
                <div class="pub-empty">
                    <i class="bi bi-inbox"></i>
                    <p>No papers in this category yet.</p>
                </div>`;
            return;
        }

        const countHtml = `<div class="pub-count">${papers.length} publication${papers.length > 1 ? 's' : ''}</div>`;
        const cardsHtml = papers.map((p, i) => renderPubCard(p, i)).join('');
        container.innerHTML = countHtml + cardsHtml;

        // Re-trigger MathJax for any math content
        if (typeof MathJax !== 'undefined') {
            MathJax.typesetPromise([container]).catch(err => console.log('MathJax error:', err));
        }
    }

    function setupToggleButtons() {
        const buttons = document.querySelectorAll('.pub-toggle-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', function () {
                buttons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                renderPublications(currentCategory);
            });
        });
    }

    // Load publication data and render
    fetch(content_dir + 'publications.json')
        .then(response => response.json())
        .then(data => {
            publicationsData = data;
            setupToggleButtons();
            renderPublications(currentCategory);
        })
        .catch(error => {
            console.log('Publications JSON load error:', error);
            // Fallback: try loading markdown
            fetch(content_dir + 'publications.md')
                .then(response => response.text())
                .then(markdown => {
                    const html = marked.parse(markdown);
                    document.getElementById('publications-md').innerHTML = html;
                    MathJax.typeset();
                })
                .catch(() => {
                    document.getElementById('publications-md').innerHTML =
                        '<div class="pub-empty"><i class="bi bi-exclamation-triangle"></i><p>Failed to load publications.</p></div>';
                });
        });

});
