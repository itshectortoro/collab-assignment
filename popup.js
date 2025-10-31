// State management
let notes = [];
let currentNoteIndex = 0;

// DOM Elements
const initialView = document.getElementById('initialView');
const notesView = document.getElementById('notesView');
const loadingView = document.getElementById('loadingView');
const inputText = document.getElementById('inputText');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const newNoteBtn = document.getElementById('newNoteBtn');
const tabsContainer = document.getElementById('tabsContainer');
const contentContainer = document.getElementById('contentContainer');
const errorMsg = document.getElementById('errorMsg');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadNotes();
  attachEventListeners();
});

function attachEventListeners() {
  generateBtn.addEventListener('click', generateNotes);
  clearBtn.addEventListener('click', () => {
    inputText.value = '';
    errorMsg.innerHTML = '';
  });
  newNoteBtn.addEventListener('click', showInitialView);
}

async function generateNotes() {
  const text = inputText.value.trim();
  
  if (!text) {
    showError('Please paste some text to generate notes.');
    return;
  }

  try {
    showLoading();
    
    // Check API availability
    const canSummarize = await window.ai?.summarizer?.capabilities();
    const canUseLanguageModel = await window.ai?.languageModel?.capabilities();
    
    if (canSummarize?.available === 'no' || canUseLanguageModel?.available === 'no') {
      throw new Error('Chrome Built-in AI APIs are not available. Make sure you have Chrome 127+ with AI features enabled.');
    }

    // Create summarizer
    const summarizer = await window.ai.summarizer.create({
      type: 'key-points',
      format: 'markdown',
      length: 'medium'
    });

    // Generate summary
    const summary = await summarizer.summarize(text);
    
    // Create language model for reflection
    const session = await window.ai.languageModel.create({
      systemPrompt: 'You are a thoughtful note-taking assistant. Generate brief, insightful reflections on notes.'
    });

    // Generate reflection
    const reflectionPrompt = `Based on these notes:\n\n${summary}\n\nWrite a brief reflection (2-3 sentences) about the key insights and their significance.`;
    const reflection = await session.prompt(reflectionPrompt);

    // Create note sections
    const noteData = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      sections: [
        {
          title: 'Summary',
          content: summary
        },
        {
          title: 'Reflection',
          content: reflection
        },
        {
          title: 'Original Text',
          content: text
        }
      ]
    };

    // Save and display
    notes.push(noteData);
    await saveNotes();
    currentNoteIndex = notes.length - 1;
    
    // Cleanup
    summarizer.destroy();
    session.destroy();
    
    renderNotes();
    showNotesView();
    inputText.value = '';
    
  } catch (error) {
    console.error('Error generating notes:', error);
    hideLoading();
    showError(`Error: ${error.message}`);
  }
}

function renderNotes() {
  if (notes.length === 0) {
    showInitialView();
    return;
  }

  // Clear containers
  tabsContainer.innerHTML = '';
  contentContainer.innerHTML = '';

  notes.forEach((note, noteIndex) => {
    note.sections.forEach((section, sectionIndex) => {
      // Create tab
      const tab = document.createElement('button');
      tab.className = `tab ${noteIndex === currentNoteIndex && sectionIndex === 0 ? 'active' : ''}`;
      tab.dataset.noteIndex = noteIndex;
      tab.dataset.sectionIndex = sectionIndex;
      
      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.contentEditable = true;
      titleSpan.textContent = section.title;
      titleSpan.addEventListener('blur', (e) => {
        notes[noteIndex].sections[sectionIndex].title = e.target.textContent;
        saveNotes();
      });
      titleSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.target.blur();
        }
      });
      
      const deleteBtn = document.createElement('span');
      deleteBtn.className = 'delete-tab';
      deleteBtn.innerHTML = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSection(noteIndex, sectionIndex);
      });
      
      tab.appendChild(titleSpan);
      tab.appendChild(deleteBtn);
      
      tab.addEventListener('click', (e) => {
        if (e.target === titleSpan) return;
        switchTab(noteIndex, sectionIndex);
      });
      
      tabsContainer.appendChild(tab);

      // Create content section
      const contentSection = document.createElement('div');
      contentSection.className = `note-section ${noteIndex === currentNoteIndex && sectionIndex === 0 ? 'active' : ''}`;
      contentSection.dataset.noteIndex = noteIndex;
      contentSection.dataset.sectionIndex = sectionIndex;
      
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      
      const content = document.createElement('p');
      content.textContent = section.content;
      content.style.whiteSpace = 'pre-wrap';
      
      contentSection.appendChild(heading);
      contentSection.appendChild(content);
      contentContainer.appendChild(contentSection);
    });
  });
}

function switchTab(noteIndex, sectionIndex) {
  // Update tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`.tab[data-note-index="${noteIndex}"][data-section-index="${sectionIndex}"]`).classList.add('active');
  
  // Update content
  document.querySelectorAll('.note-section').forEach(section => {
    section.classList.remove('active');
  });
  document.querySelector(`.note-section[data-note-index="${noteIndex}"][data-section-index="${sectionIndex}"]`).classList.add('active');
  
  currentNoteIndex = noteIndex;
}

function deleteSection(noteIndex, sectionIndex) {
  if (notes[noteIndex].sections.length === 1) {
    // Delete entire note if it's the last section
    notes.splice(noteIndex, 1);
  } else {
    // Delete just the section
    notes[noteIndex].sections.splice(sectionIndex, 1);
  }
  
  saveNotes();
  renderNotes();
}

function showInitialView() {
  initialView.style.display = 'flex';
  notesView.style.display = 'none';
  loadingView.style.display = 'none';
  inputText.value = '';
  errorMsg.innerHTML = '';
}

function showNotesView() {
  initialView.style.display = 'none';
  notesView.style.display = 'flex';
  loadingView.style.display = 'none';
}

function showLoading() {
  initialView.style.display = 'none';
  notesView.style.display = 'none';
  loadingView.style.display = 'block';
}

function hideLoading() {
  loadingView.style.display = 'none';
  initialView.style.display = 'flex';
}

function showError(message) {
  errorMsg.innerHTML = `<div class="error">${message}</div>`;
}

// Storage functions
async function saveNotes() {
  try {
    await chrome.storage.local.set({ notes: notes });
  } catch (error) {
    console.error('Error saving notes:', error);
  }
}

async function loadNotes() {
  try {
    const result = await chrome.storage.local.get(['notes']);
    if (result.notes) {
      notes = result.notes;
      renderNotes();
      if (notes.length > 0) {
        showNotesView();
      }
    }
  } catch (error) {
    console.error('Error loading notes:', error);
  }
}