const container = document.getElementById("subjects-container");
const addBtn = document.getElementById("add-subject");
const sendBtn = document.getElementById("sendBtn");
const responsePre = document.getElementById("response");
const splashScreen = document.querySelector(".splash-screen");
const mainContainer = document.querySelector(".container");
const toggleButton = document.getElementById('theme-toggle');

responsePre.style.display = "none";

async function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  toggleButton.setAttribute('aria-label', theme);
  localStorage.setItem('theme', theme);
  try {
    await browser.storage.local.set({ theme });
  } catch (error) {
    console.error('Error saving theme:', error);
  }
  
  await updateExtensionIcon(theme);
}

async function updateExtensionIcon(theme) {
  const iconPath = theme === 'dark' ? 'icons/dark' : 'icons/light';
  try {
    await browser.sidebarAction.setIcon({
      path: {
        "16": `${iconPath}/icon16.png`,
        "32": `${iconPath}/icon32.png`,
        "48": `${iconPath}/icon48.png`,
        "128": `${iconPath}/icon128.png`
      }
    });
  } catch (error) {
    console.error('Error setting icon:', error);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  setTimeout(() => {
    splashScreen.classList.add("hidden");
    mainContainer.classList.add("visible");
  }, 1500);

  try {
    const result = await browser.storage.local.get(['theme']);
    const savedTheme = result.theme || localStorage.getItem('theme') || 'dark';
    await applyTheme(savedTheme);
  } catch (error) {
    console.error('Error loading theme:', error);
    await applyTheme('dark');
  }
});

function createSubjectGroup() {
  const group = document.createElement("div");
  group.className = "subject-group";

  // Header section
  const header = document.createElement("div");
  header.className = "subject-header";
  header.setAttribute("tabindex", "0");

  const subjectInput = document.createElement("input");
  subjectInput.type = "text";
  subjectInput.name = "subject_code";
  subjectInput.placeholder = "Subject Code (e.g. ABC123)";
  subjectInput.required = true;

  const actions = document.createElement("div");
  actions.className = "subject-actions";

  const toggleIcon = document.createElement("span");
  toggleIcon.className = "toggle-icon";
  toggleIcon.innerHTML = "&#9654;";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-subject";
  deleteBtn.title = "Delete this subject";
  deleteBtn.innerHTML = "&times;";

  actions.appendChild(toggleIcon);
  actions.appendChild(deleteBtn);
  header.appendChild(subjectInput);
  header.appendChild(actions);

  // Content section
  const content = document.createElement("div");
  content.className = "subject-content";

  const labelSection = document.createElement("label");
  labelSection.textContent = "Section";
  const inputSection = document.createElement("input");
  inputSection.type = "text";
  inputSection.name = "lect_group";
  inputSection.placeholder = "01";
  inputSection.required = true;

  const labelLab = document.createElement("label");
  labelLab.textContent = "Lab";
  const inputLab = document.createElement("input");
  inputLab.type = "text";
  inputLab.name = "tut_group";
  inputLab.placeholder = "01A";
  inputLab.required = true;

  content.appendChild(labelSection);
  content.appendChild(inputSection);
  content.appendChild(labelLab);
  content.appendChild(inputLab);

  group.appendChild(header);
  group.appendChild(content);

  // Toggle logic
  function toggleGroup() {
    const isExpanded = group.classList.toggle("expanded");
    toggleIcon.innerHTML = isExpanded ? "&#9660;" : "&#9654;";
    if (isExpanded) {
      inputSection.focus();
    }
  }

  header.addEventListener("click", () => toggleGroup());
  header.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleGroup();
    }
  });

  // Delete logic
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this subject?")) {
      group.remove();
      if (container.querySelectorAll(".subject-group").length === 0) {
        addSubjectGroup();
      }
    }
  });

  return group;
}


addSubjectGroup();
addBtn.addEventListener("click", addSubjectGroup);

function addSubjectGroup() {
  const newGroup = createSubjectGroup();
  container.appendChild(newGroup);
  newGroup.querySelector('input[name="subject_code"]').focus();
}

function setResponseMessage(text, type = "success") {
  responsePre.style.display = "block";
  const style = type === "error"
    ? "color: red; font-weight: bold;"
    : "color: green; font-weight: bold;";
  responsePre.setAttribute("style", style);
  responsePre.textContent = text;
}

sendBtn.addEventListener("click", async () => {
  setResponseMessage("Registering subjects...");
  sendBtn.disabled = true;

  try {
    const groups = container.querySelectorAll(".subject-group");
    if (groups.length === 0) throw new Error("Please add at least one subject");

    const subjects = [];

    groups.forEach((group, i) => {
      const subject_code = group.querySelector('input[name="subject_code"]').value.trim().toUpperCase();
      const lect_group = group.querySelector('input[name="lect_group"]').value.trim();
      const tut_group = group.querySelector('input[name="tut_group"]').value.trim().toUpperCase();

      if (!subject_code) throw new Error(`Subject Code missing in entry #${i + 1}`);
      if (!lect_group) throw new Error(`Section missing in entry #${i + 1}`);
      if (!tut_group) throw new Error(`Lab missing in entry #${i + 1}`);

      subjects.push({ subj: subject_code, lectGrp: lect_group, tutGrp: tut_group });
    });

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) throw new Error("No active tab found.");

    const response = await browser.tabs.sendMessage(tabs[0].id, { 
      type: "REGISTER_SUBJECTS", 
      subjects 
    });

    const { status, results } = response;
    const style = status === "error"
      ? "color: red; font-weight: bold;"
      : "color: green; font-weight: bold;";

    responsePre.style.display = "block";
    responsePre.setAttribute("style", style);

    responsePre.textContent = results.map(r =>
      `[${r.status.toUpperCase()}] ${r.subj}:\n${r.message}`
    ).join("\n\n");

    sendBtn.disabled = false;
  } catch (err) {
    setResponseMessage("Error: " + err.message, "error");
    sendBtn.disabled = false;
  }
});

toggleButton.addEventListener('click', async () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  
  try {
    await applyTheme(next);
    await browser.runtime.sendMessage({ 
      type: 'THEME_CHANGED', 
      theme: next 
    });
  } catch (error) {
    console.error('Theme change error:', error);
  }
});

document.getElementById('saveBtn').addEventListener('click', () => {
  try {
    const groups = document.querySelectorAll('.subject-group');
    if (groups.length === 0) {
      setResponseMessage('No subjects to save', 'error');
      return;
    }

    const subjects = Array.from(groups).map(group => {
      return {
        subj: group.querySelector('input[name="subject_code"]').value.trim(),
        lectGrp: group.querySelector('input[name="lect_group"]').value.trim(),
        tutGrp: group.querySelector('input[name="tut_group"]').value.trim()
      };
    }).filter(subject => subject.subj && subject.lectGrp && subject.tutGrp);

    if (subjects.length === 0) {
      setResponseMessage('No valid subjects to save', 'error');
      return;
    }

    const blob = new Blob([JSON.stringify(subjects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orsys_subjects.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setResponseMessage(`Saved ${subjects.length} subjects successfully!`, 'success');
  } catch (err) {
    setResponseMessage('Error saving subjects: ' + err.message, 'error');
  }
});

document.getElementById('loadBtn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          throw new Error('Invalid file format - expected array of subjects');
        }

        const container = document.getElementById('subjects-container');
        container.innerHTML = '';

        data.forEach(subject => {
          if (subject.subj && subject.lectGrp && subject.tutGrp) {
            const group = createSubjectGroup();
            container.appendChild(group);
            group.querySelector('input[name="subject_code"]').value = subject.subj;
            group.querySelector('input[name="lect_group"]').value = subject.lectGrp;
            group.querySelector('input[name="tut_group"]').value = subject.tutGrp;
          }
        });

        setResponseMessage(`Loaded ${data.length} subjects successfully`, 'success');
      } catch (err) {
        setResponseMessage('Error loading file: ' + err.message, 'error');
        if (document.querySelectorAll('.subject-group').length === 0) {
          addSubjectGroup();
        }
      }
    };

    reader.onerror = () => {
      setResponseMessage('Error reading file', 'error');
      if (document.querySelectorAll('.subject-group').length === 0) {
        addSubjectGroup();
      }
    };

    reader.readAsText(file);
  });

  input.click();
});