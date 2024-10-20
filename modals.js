// modals.js

function openOptionsModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const modal = document.getElementById('options-modal');
    modal.classList.remove('hidden');

    // Update options modal fields
    const tabWidthInput = document.getElementById('tab-width-input');
    tabWidthInput.value = settings.tabWidth || 120;
}

function saveOptionsModal() {
    const tabWidthInput = document.getElementById('tab-width-input');
    const tabWidth = parseInt(tabWidthInput.value);

    if (tabWidth >= 50 && tabWidth <= 300) {
        userSettings.tabWidth = tabWidth;
    } else {
        alert('Please enter a tab width between 50 and 300 pixels.');
        return;
    }

    saveUserData().then(() => {
        mergeData(); // Re-merge data to update settings
        updateTabWidth(); // Update tab width
        renderSections();
        closeModals();
    });
}

function closeModals() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
}

function openTabModal(editMode = false, tabIndex = null) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const modal = document.getElementById('tab-modal');
    modal.classList.remove('hidden');

    const title = editMode ? 'Edit Tab' : 'Add Tab';
    document.getElementById('tab-modal-title').textContent = title;

    const nameInput = document.getElementById('tab-name-input');
    const columnsInput = document.getElementById('tab-columns-input');

    if (editMode) {
        const tab = tabs[tabIndex];
        nameInput.value = tab.tabName;
        columnsInput.value = tab.numberOfColumns || 4;
    } else {
        nameInput.value = '';
        columnsInput.value = 4; // Default value
    }
    nameInput.focus();

    modal.dataset.editMode = editMode;
    modal.dataset.tabIndex = tabIndex;
}

function saveTabModal() {
    const modal = document.getElementById('tab-modal');
    const tabName = document.getElementById('tab-name-input').value.trim();
    const numberOfColumns = parseInt(document.getElementById('tab-columns-input').value);

    if (numberOfColumns < 1 || numberOfColumns > 20) {
        alert('Please enter a number of columns between 1 and 20.');
        return;
    }

    if (tabName || tabName === '') {
        if (modal.dataset.editMode === 'true') {
            const tabIndex = modal.dataset.tabIndex;
            tabs[tabIndex].tabName = tabName;
            tabs[tabIndex].numberOfColumns = numberOfColumns;
            updateUserTab(tabs[tabIndex]);
        } else {
            const newTab = {
                tabId: generateUniqueId('tab'),
                tabName,
                sections: [],
                numberOfColumns: numberOfColumns
            };
            tabs.push(newTab);
            userTabs.push(newTab);
            activeTabId = newTab.tabId;
        }
        saveUserData().then(() => {
            initializeTabs();
            renderTabs();
            renderSections();
            closeModals();
        });
    }
}

function showTabContextMenu(x, y, tabIndex) {
    removeContextMenus(); // Remove existing context menus
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Menu Title
    const titleItem = document.createElement('div');
    titleItem.className = 'context-menu-title';
    titleItem.textContent = 'Tab Context Menu';

    const editItem = document.createElement('div');
    editItem.className = 'context-menu-item';
    editItem.textContent = 'Edit';
    editItem.addEventListener('click', () => {
        openTabModal(true, tabIndex);
        menu.remove();
    });

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item';
    deleteItem.textContent = 'Delete';
    deleteItem.addEventListener('click', () => {
        deleteTab(tabIndex);
        menu.remove();
    });

    menu.appendChild(titleItem);
    menu.appendChild(editItem);
    menu.appendChild(deleteItem);

    document.body.appendChild(menu);
}

function deleteTab(tabIndex) {
    if (confirm('Are you sure you want to delete this tab?')) {
        const tabId = tabs[tabIndex].tabId;
        tabs.splice(tabIndex, 1);
        userTabs = userTabs.filter(ut => ut.tabId !== tabId);
        if (activeTabId === tabId) {
            activeTabId = tabs.length > 0 ? tabs[0].tabId : null;
        }
        saveUserData().then(() => {
            initializeTabs();
            renderTabs();
            renderSections();
        });
    }
}

function openSectionModal(editMode = false, sectionIndex = null, columnIndex = null) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const modal = document.getElementById('section-modal');
    modal.classList.remove('hidden');

    const title = editMode ? 'Edit Group' : 'Add Group';
    document.getElementById('section-modal-title').textContent = title;

    const input = document.getElementById('section-name-input');
    const activeTab = tabs.find(tab => tab.tabId === activeTabId);
    if (editMode) {
        input.value = activeTab.sections[sectionIndex].sectionName;
    } else {
        input.value = '';
    }
    input.focus();

    modal.dataset.editMode = editMode;
    modal.dataset.sectionIndex = sectionIndex;
    modal.dataset.columnIndex = columnIndex; // Store column index
}

function saveSectionModal() {
    const modal = document.getElementById('section-modal');
    const sectionName = document.getElementById('section-name-input').value.trim();

    if (sectionName) {
        const activeTab = tabs.find(tab => tab.tabId === activeTabId);
        if (!activeTab.sections) activeTab.sections = [];

        if (modal.dataset.editMode === 'true') {
            const sectionIndex = modal.dataset.sectionIndex;
            activeTab.sections[sectionIndex].sectionName = sectionName;
        } else {
            const columnIndex = modal.dataset.columnIndex !== 'null' ? parseInt(modal.dataset.columnIndex) : getColumnWithFewestSections(activeTab.sections, activeTab.numberOfColumns || 4);
            const newSection = {
                sectionId: generateUniqueId('section'),
                sectionName,
                pages: [],
                columnIndex: columnIndex,
                collapsed: false // Default to expanded
            };
            activeTab.sections.push(newSection);
        }
        updateUserTab(activeTab);
        saveUserData().then(() => {
            renderSections();
            closeModals();
        });
    }
}

function showSectionContextMenu(x, y, sectionIndex) {
    removeContextMenus(); // Remove existing context menus
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Menu Title
    const titleItem = document.createElement('div');
    titleItem.className = 'context-menu-title';
    titleItem.textContent = 'Group Context Menu';

    const openAllItem = document.createElement('div');
    openAllItem.className = 'context-menu-item';
    openAllItem.textContent = 'Open All Pages';
    openAllItem.addEventListener('click', () => {
        openAllPagesInSection(sectionIndex);
        menu.remove();
    });

    const addMultiplePagesItem = document.createElement('div');
    addMultiplePagesItem.className = 'context-menu-item';
    addMultiplePagesItem.textContent = 'Add Multiple Pages';
    addMultiplePagesItem.addEventListener('click', () => {
        openAddMultiplePagesModal(sectionIndex);
        menu.remove();
    });

    const editItem = document.createElement('div');
    editItem.className = 'context-menu-item';
    editItem.textContent = 'Edit';
    editItem.addEventListener('click', () => {
        openSectionModal(true, sectionIndex);
        menu.remove();
    });

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item';
    deleteItem.textContent = 'Delete';
    deleteItem.addEventListener('click', () => {
        deleteSection(sectionIndex);
        menu.remove();
    });

    menu.appendChild(titleItem);
    menu.appendChild(openAllItem);
    menu.appendChild(addMultiplePagesItem);
    menu.appendChild(editItem);
    menu.appendChild(deleteItem);

    document.body.appendChild(menu);
}

function openAddMultiplePagesModal(sectionIndex) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const modal = document.getElementById('add-multiple-pages-modal');
    modal.classList.remove('hidden');

    const textarea = document.getElementById('multiple-pages-textarea');
    textarea.value = '';
    textarea.focus();

    modal.dataset.sectionIndex = sectionIndex;
}

function saveAddMultiplePagesModal() {
    const modal = document.getElementById('add-multiple-pages-modal');
    const sectionIndex = modal.dataset.sectionIndex;
    const textarea = document.getElementById('multiple-pages-textarea');
    const urls = textarea.value.trim().split('\n').map(url => url.trim()).filter(url => url !== '');

    if (urls.length === 0) {
        alert('Please enter at least one URL.');
        return;
    }

    const activeTab = tabs.find(tab => tab.tabId === activeTabId);
    const section = activeTab.sections[sectionIndex];

    urls.forEach(url => {
        const favicon = getFavicon(url);
        const pageData = {
            url,
            name: url,
            favicon,
            nameOverride: null
        };
        section.pages.push(pageData);
    });

    updateUserTab(activeTab);
    saveUserData().then(() => {
        renderSections();
        closeModals();
    });
}

function openAllPagesInSection(sectionIndex) {
    const activeTab = tabs.find(tab => tab.tabId === activeTabId);
    const section = activeTab.sections[sectionIndex];

    section.pages.forEach(page => {
        window.open(page.url, '_blank');
    });
}

function deleteSection(sectionIndex) {
    const activeTab = tabs.find(tab => tab.tabId === activeTabId);
    if (activeTab.sections[sectionIndex].pages.length > 0) {
        if (!confirm('This group has pages inside. Are you sure you want to delete it?')) {
            return;
        }
    }
    activeTab.sections.splice(sectionIndex, 1);
    updateUserTab(activeTab);
    saveUserData().then(() => {
        renderSections();
    });
}

function openPageModal(sectionIndex, editMode = false, pageIndex = null) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const modal = document.getElementById('page-modal');
    modal.classList.remove('hidden');

    const title = editMode ? 'Edit Page' : 'Add Page';
    document.getElementById('page-modal-title').textContent = title;

    const urlInput = document.getElementById('page-url-input');
    const nameInput = document.getElementById('page-name-input');

    const activeTab = tabs.find(tab => tab.tabId === activeTabId);
    const section = activeTab.sections[sectionIndex];

    if (editMode) {
        const page = section.pages[pageIndex];
        urlInput.value = page.url;
        nameInput.value = page.nameOverride || page.name;
    } else {
        urlInput.value = '';
        nameInput.value = '';
    }

    urlInput.focus();

    modal.dataset.editMode = editMode;
    modal.dataset.sectionIndex = sectionIndex;
    modal.dataset.pageIndex = pageIndex;
}

function savePageModal() {
    const modal = document.getElementById('page-modal');
    const url = document.getElementById('page-url-input').value.trim();
    const name = document.getElementById('page-name-input').value.trim() || url;

    const sectionIndex = modal.dataset.sectionIndex;

    const activeTab = tabs.find(tab => tab.tabId === activeTabId);
    const section = activeTab.sections[sectionIndex];

    if (url) {
        const favicon = getFavicon(url);
        const pageData = {
            url,
            name,
            favicon,
            nameOverride: name !== url ? name : null
        };

        if (modal.dataset.editMode === 'true') {
            const pageIndex = modal.dataset.pageIndex;
            section.pages[pageIndex] = pageData;
        } else {
            section.pages.push(pageData);
        }
        updateUserTab(activeTab);
        saveUserData().then(() => {
            renderSections();
            closeModals();
        });
    }
}

function showPageContextMenu(x, y, sectionIndex, pageIndex) {
    removeContextMenus(); // Remove existing context menus
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Menu Title
    const titleItem = document.createElement('div');
    titleItem.className = 'context-menu-title';
    titleItem.textContent = 'Page Context Menu';

    const editItem = document.createElement('div');
    editItem.className = 'context-menu-item';
    editItem.textContent = 'Edit';
    editItem.addEventListener('click', () => {
        openPageModal(sectionIndex, true, pageIndex);
        menu.remove();
    });

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item';
    deleteItem.textContent = 'Delete';
    deleteItem.addEventListener('click', () => {
        deletePage(sectionIndex, pageIndex);
        menu.remove();
    });

    menu.appendChild(titleItem);
    menu.appendChild(editItem);
    menu.appendChild(deleteItem);

    document.body.appendChild(menu);
}

function deletePage(sectionIndex, pageIndex) {
    if (confirm('Are you sure you want to delete this page?')) {
        const activeTab = tabs.find(tab => tab.tabId === activeTabId);
        activeTab.sections[sectionIndex].pages.splice(pageIndex, 1);
        updateUserTab(activeTab);
        saveUserData().then(() => {
            renderSections();
        });
    }
}

// Helper function to update userTabs
function updateUserTab(tab) {
    const index = userTabs.findIndex(ut => ut.tabId === tab.tabId);
    if (index !== -1) {
        userTabs[index] = tab;
    } else {
        userTabs.push(tab);
    }
}

// Function to generate unique IDs
function generateUniqueId(prefix) {
    return prefix + '-' + Math.random().toString(36).substr(2, 9);
}

// Get Favicon URL
function getFavicon(url) {
    try {
        const urlObj = new URL(url);
        const faviconUrl = `${urlObj.origin}/favicon.ico`;
        return faviconUrl;
    } catch (e) {
        return browser.runtime.getURL('icons/default-favicon.png');
    }
}

// Export and Import Functions

function openExportModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const modal = document.getElementById('export-import-modal');
    modal.classList.remove('hidden');
    document.getElementById('export-import-modal-title').textContent = 'Export Data';
    document.getElementById('export-import-textarea').value = JSON.stringify({
        userSettings,
        userTabs
    }, null, 2);
    // Hide Save button as we're only exporting
    document.getElementById('export-import-save-button').style.display = 'none';
}

function openImportModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const modal = document.getElementById('export-import-modal');
    modal.classList.remove('hidden');
    document.getElementById('export-import-modal-title').textContent = 'Import Data';
    document.getElementById('export-import-textarea').value = '';
    // Show Save button for import
    document.getElementById('export-import-save-button').style.display = 'inline-block';
}

function saveImportData() {
    const textarea = document.getElementById('export-import-textarea');
    try {
        const importedData = JSON.parse(textarea.value);
        if (importedData.userSettings && importedData.userTabs) {
            // Validate data structure
            userSettings = importedData.userSettings;
            userTabs = importedData.userTabs;
            saveUserData().then(() => {
                mergeData();
                initializeTabs();
                renderTabs();
                renderSections();
                closeModals();
            });
        } else {
            alert('Invalid data format. Please ensure the data includes userSettings and userTabs.');
        }
    } catch (e) {
        alert('Error parsing JSON data. Please ensure it is valid JSON.');
    }
}

// Expose functions to window
window.openOptionsModal = openOptionsModal;
window.saveOptionsModal = saveOptionsModal;
window.closeModals = closeModals;
window.openTabModal = openTabModal;
window.saveTabModal = saveTabModal;
window.showTabContextMenu = showTabContextMenu;
window.deleteTab = deleteTab;
window.openSectionModal = openSectionModal;
window.saveSectionModal = saveSectionModal;
window.showSectionContextMenu = showSectionContextMenu;
window.deleteSection = deleteSection;
window.openAllPagesInSection = openAllPagesInSection;
window.openPageModal = openPageModal;
window.savePageModal = savePageModal;
window.showPageContextMenu = showPageContextMenu;
window.deletePage = deletePage;
window.generateUniqueId = generateUniqueId;
window.getFavicon = getFavicon;
window.openExportModal = openExportModal;
window.openImportModal = openImportModal;
window.saveImportData = saveImportData;
window.openAddMultiplePagesModal = openAddMultiplePagesModal;
window.saveAddMultiplePagesModal = saveAddMultiplePagesModal;
