// columns.js

function initializeColumns(numColumns) {
    const columnsContainer = document.getElementById('columns');
    columnsContainer.innerHTML = ''; // Clear existing columns

    // Set the CSS variable for number of columns
    columnsContainer.style.setProperty('--num-columns', numColumns);

    for (let i = 0; i < numColumns; i++) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        columnDiv.dataset.columnIndex = i;

        columnsContainer.appendChild(columnDiv);
    }
}

function renderSections() {
    const columnsContainer = document.getElementById('columns');
    const activeTab = tabs.find(tab => tab.tabId === activeTabId);
    if (!activeTab) return;

    const numColumns = activeTab.numberOfColumns || 4; // Default to 4 columns if not set
    initializeColumns(numColumns);

    const columnElements = columnsContainer.getElementsByClassName('column');

    // Clear all columns except the "Add Group" buttons
    Array.from(columnElements).forEach(column => {
        // Remove all child elements except the add-group-button
        const addGroupButton = column.querySelector('.add-group-button');
        column.innerHTML = '';
        if (addGroupButton) {
            column.appendChild(addGroupButton);
        }
    });

    let sections = activeTab.sections || [];

    // Adjust sections with columnIndex beyond the number of columns
    sections.forEach(section => {
        if (section.columnIndex >= numColumns) {
            section.columnIndex = numColumns - 1; // Move to last valid column
        }
    });

    // Distribute sections to columns
    sections.forEach((section, sectionIndex) => {
        // Ensure the section has a columnIndex
        if (typeof section.columnIndex !== 'number' || section.columnIndex >= numColumns) {
            section.columnIndex = getColumnWithFewestSections(sections, numColumns);
        }

        const columnDiv = columnsContainer.querySelector(`.column[data-column-index='${section.columnIndex}']`);

        // Create section element
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section';
        sectionDiv.dataset.sectionId = section.sectionId;

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';

        const sectionTitle = document.createElement('h2');
        sectionTitle.textContent = section.sectionName;

        // Collapse/Expand Icon
        const isCollapsed = section.collapsed || false;
        const collapseIcon = document.createElement('div');
        collapseIcon.className = 'collapse-icon';
        collapseIcon.textContent = isCollapsed ? '▶' : '▼'; // Use Unicode characters safely

        sectionHeader.appendChild(sectionTitle);
        sectionHeader.appendChild(collapseIcon);

        // Collapse/Expand on click of section header
        sectionHeader.addEventListener('click', () => {
            section.collapsed = !section.collapsed;
            updateUserTab(activeTab);
            saveUserData().then(() => {
                renderSections();
            });
        });

        // Right-click context menu for section
        sectionHeader.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            removeContextMenus(); // Remove existing context menus
            showSectionContextMenu(e.pageX, e.pageY, sectionIndex);
        });

        sectionDiv.appendChild(sectionHeader);

        if (!isCollapsed) {
            const pagesDiv = document.createElement('div');
            pagesDiv.className = 'pages';
            pagesDiv.dataset.sectionId = section.sectionId;

            section.pages.forEach((page, pageIndex) => {
                const pageButton = document.createElement('div');
                pageButton.className = 'page-button';
                pageButton.dataset.pageId = page.pageId;
                pageButton.dataset.sectionId = section.sectionId;

                const faviconImg = document.createElement('img');
                faviconImg.className = 'favicon';
                faviconImg.src = page.favicon || browser.runtime.getURL('icons/default-favicon.png');
                faviconImg.alt = 'Favicon';
                faviconImg.onerror = function () {
                    this.src = browser.runtime.getURL('icons/default-favicon.png');
                };

                const pageNameSpan = document.createElement('span');
                pageNameSpan.textContent = page.nameOverride || page.name;

                pageButton.appendChild(faviconImg);
                pageButton.appendChild(pageNameSpan);

                // Set tooltip with name and URL
                pageButton.title = `${page.name}\n${page.url}`;

                // On click, open the page in current tab
                pageButton.addEventListener('click', () => {
                    window.open(page.url, '_self');
                });

                // Middle-click to open in new tab
                pageButton.addEventListener('auxclick', (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        window.open(page.url, '_blank');
                    }
                });

                // Right-click context menu for page
                pageButton.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    removeContextMenus(); // Remove existing context menus
                    showPageContextMenu(e.pageX, e.pageY, sectionIndex, pageIndex);
                });

                pagesDiv.appendChild(pageButton);
            });

            // Add [+] button to add new page
            const addPageButton = document.createElement('button');
            addPageButton.className = 'add-page-button';
            addPageButton.textContent = '+ Add Page';
            addPageButton.dataset.sectionId = section.sectionId;
            addPageButton.addEventListener('click', () => {
                openPageModal(sectionIndex);
            });
            pagesDiv.appendChild(addPageButton);

            sectionDiv.appendChild(pagesDiv);
        }

        // Insert the section before the "Add Group" button
        const addGroupButton = columnDiv.querySelector('.add-group-button');
        if (addGroupButton) {
            columnDiv.insertBefore(sectionDiv, addGroupButton);
        } else {
            columnDiv.appendChild(sectionDiv);
        }
    });

    // Add "Add Group" button to each column at the bottom
    Array.from(columnElements).forEach(column => {
        const columnIndex = column.dataset.columnIndex;
        const addGroupButton = document.createElement('button');
        addGroupButton.className = 'add-group-button';
        addGroupButton.textContent = '+ Add Group';
        addGroupButton.dataset.columnIndex = columnIndex;
        addGroupButton.addEventListener('click', () => {
            openSectionModal(false, null, parseInt(columnIndex));
        });
        column.appendChild(addGroupButton);
    });

    // Initialize SortableJS for columns and pages
    initSortable();
}

function initSortable() {
    // Sortable for sections in columns
    const columnElements = document.querySelectorAll('.column');
    columnElements.forEach(column => {
        Sortable.create(column, {
            group: 'sections',
            animation: 150,
            handle: '.section-header',
            onEnd: (evt) => {
                updateSectionOrder();
            },
            filter: '.add-group-button',
            preventOnFilter: false,
        });
    });

    // Sortable for pages with dragging between groups
    const pagesContainers = document.querySelectorAll('.pages');
    pagesContainers.forEach(pagesDiv => {
        Sortable.create(pagesDiv, {
            group: 'pages', // Allow dragging between groups
            animation: 150,
            filter: '.add-page-button',
            preventOnFilter: false,
            onEnd: (evt) => {
                if (evt.item.classList.contains('add-page-button')) return;

                // Get section IDs instead of indices
                const oldSectionId = evt.from.parentElement.dataset.sectionId;
                const newSectionId = evt.to.parentElement.dataset.sectionId;

                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;

                const activeTab = tabs.find(tab => tab.tabId === activeTabId);
                if (!activeTab) return;

                const oldSection = activeTab.sections.find(section => section.sectionId === oldSectionId);
                const newSection = activeTab.sections.find(section => section.sectionId === newSectionId);

                if (!oldSection || !newSection) return;

                const page = oldSection.pages.splice(oldIndex, 1)[0];
                newSection.pages.splice(newIndex, 0, page);

                // Update user data for active tab
                updateUserTab(activeTab);
                saveUserData().then(() => {
                    renderSections();
                });
            }
        });
    });
}

function updateSectionOrder() {
    const columnsContainer = document.getElementById('columns');
    const columnElements = columnsContainer.getElementsByClassName('column');

    const activeTab = tabs.find(tab => tab.tabId === activeTabId);
    if (!activeTab) return;

    const sections = [];

    Array.from(columnElements).forEach((column, columnIndex) => {
        const sectionDivs = column.getElementsByClassName('section');
        Array.from(sectionDivs).forEach(sectionDiv => {
            const sectionId = sectionDiv.dataset.sectionId;
            const section = activeTab.sections.find(s => s.sectionId === sectionId);
            if (section) {
                section.columnIndex = columnIndex;
                sections.push(section);
            }
        });
    });

    activeTab.sections = sections;
    updateUserTab(activeTab);
    saveUserData().then(() => {
        renderSections();
    });
}

function getColumnWithFewestSections(sections, numColumns) {
    const columnCounts = Array(numColumns).fill(0);

    sections.forEach(section => {
        if (typeof section.columnIndex === 'number' && section.columnIndex < numColumns) {
            columnCounts[section.columnIndex]++;
        }
    });

    // Find the column(s) with the fewest sections
    const minCount = Math.min(...columnCounts);
    const candidateColumns = columnCounts.reduce((acc, count, index) => {
        if (count === minCount) {
            acc.push(index);
        }
        return acc;
    }, []);

    // Return the lowest column index among candidates
    return candidateColumns[0];
}

// Expose functions to window
window.initializeColumns = initializeColumns;
window.renderSections = renderSections;
window.getColumnWithFewestSections = getColumnWithFewestSections;
