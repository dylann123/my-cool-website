(function () {
  const story = parseStory(window.PLAIN_VN_STORY || "");
  const backgrounds = toMap(story.backgrounds);
  const audioThemes = toMap(story.audio);

  let sections = [];
  let activeIndex = 0;
  let audioEnabled = true;
  let audioPlayer = null;
  let activeAudioId = "";
  let ignoreNextFocus = false;
  let scrollFrame = 0;
  let audioUnlocked = false;
  let currentSceneIndex = -1;
  let activeBackgroundLayer = null;

  function parseStory(source) {
    const data = parseIndented(source);
    const backgrounds = Object.entries(data.backgrounds || {}).map(([id, background]) => ({
      id,
      ...background
    }));
    const audio = Object.entries(data.audio || {}).map(([id, theme]) => ({
      id,
      ...theme
    }));
    const scenes = Object.entries(data.story || {}).map(([id, scene]) => ({
      id,
      number: scene.number || "",
      title: scene.title || id,
      page: scene.page || "",
      summary: scene.summary || "",
      sections: numberedChildren(scene)
    }));

    return { backgrounds, audio, scenes };
  }

  function parseIndented(source) {
    const root = {};
    const stack = [{ indent: -1, value: root }];
    const lines = String(source || "").replace(/\t/g, "  ").split(/\r?\n/);
    let block = null;

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index].replace(/\s+$/, "");
      const trimmed = rawLine.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        if (block && block.lines.length) {
          block.lines.push("");
        }
        continue;
      }

      const indent = rawLine.match(/^ */)[0].length;

      if (block) {
        if (indent > block.indent) {
          if (block.contentIndent === null) {
            block.contentIndent = indent;
          }
          block.lines.push(rawLine.slice(Math.min(indent, block.contentIndent)));
          continue;
        }

        block.parent[block.key] = block.lines.join("\n").trim();
        block = null;
      }

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const match = trimmed.match(/^([^:]+):(.*)$/);
      if (!match) {
        continue;
      }

      const key = match[1].trim();
      const value = match[2].trim();
      const parent = stack[stack.length - 1].value;

      if (value === "|") {
        parent[key] = "";
        block = { parent, key, indent, contentIndent: null, lines: [] };
      } else if (value === "") {
        parent[key] = {};
        stack.push({ indent, value: parent[key] });
      } else {
        parent[key] = value;
      }
    }

    if (block) {
      block.parent[block.key] = block.lines.join("\n").trim();
    }

    return root;
  }

  function numberedChildren(scene) {
    return Object.keys(scene)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => ({ order: Number(key), ...scene[key] }));
  }

  function toMap(items) {
    return items.reduce((map, item) => {
      map[item.id] = item;
      return map;
    }, {});
  }

  function el(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function applyBackground(backgroundId) {
    const background = backgrounds[backgroundId] || backgrounds.index;
    document.body.dataset.bg = backgroundId || "index";
    document.body.style.setProperty("--scene-color", background && background.color ? background.color : "#000");

    const image = background && background.image ? `url("${assetPath(background.image).replace(/"/g, '\\"')}")` : "none";
    const nextLayer = activeBackgroundLayer === "a" ? "b" : "a";
    const currentLayer = activeBackgroundLayer || "a";

    if (!activeBackgroundLayer) {
      document.body.style.setProperty("--scene-image-a", image);
      document.body.style.setProperty("--scene-image-b", "none");
      document.body.style.setProperty("--scene-opacity-a", "1");
      document.body.style.setProperty("--scene-opacity-b", "0");
      activeBackgroundLayer = "a";
      return;
    }

    document.body.style.setProperty(`--scene-image-${nextLayer}`, image);
    document.body.style.setProperty(`--scene-opacity-${nextLayer}`, "1");
    document.body.style.setProperty(`--scene-opacity-${currentLayer}`, "0");
    activeBackgroundLayer = nextLayer;
  }

  function renderIndex() {
    applyBackground("index");

    const title = document.querySelector("[data-index-title]");
    const subtitle = document.querySelector("[data-index-subtitle]");
    const list = document.querySelector("[data-scene-list]");

    if (title) {
      title.textContent = "Scene Index";
    }
    if (subtitle) {
      subtitle.textContent = "Each scene is a separate HTML page, ordered chronologically.";
    }
    if (!list) {
      return;
    }

    list.textContent = "";
    story.scenes.forEach((scene) => {
      const link = el("a", "scene-link");
      link.href = scene.page;

      const number = el("span", "scene-number", scene.number || "");
      const copy = el("span");
      const sceneTitle = el("strong", "", scene.title || scene.id);
      const summary = el("small", "", scene.summary || "");

      copy.append(sceneTitle, summary);
      link.append(number, copy);
      list.append(link);
    });
  }

  function renderScene() {
    const sceneId = document.body.dataset.sceneId;
    const scene = story.scenes.find((item) => item.id === sceneId);
    const sceneIndex = story.scenes.indexOf(scene);
    currentSceneIndex = sceneIndex;

    if (!scene) {
      renderMissingScene(sceneId);
      return;
    }

    document.title = `Scene ${scene.number} - ${scene.title}`;
    document.querySelector("[data-scene-number]").textContent = `Scene ${scene.number}`;
    document.querySelector("[data-scene-title]").textContent = scene.title;
    renderSceneNav(sceneIndex);
    renderSections(scene.sections);
    renderStatusPanel();
    wireSceneInteractions();
    requestAnimationFrame(() => selectSection(0, { scroll: true, behavior: "auto" }));
  }

  function renderMissingScene(sceneId) {
    const shell = document.querySelector("[data-reader-shell]");
    if (shell) {
      shell.textContent = "";
      shell.append(el("p", "empty-state", `Scene "${sceneId}" was not found in data/story.js.`));
    }
  }

  function renderSceneNav(sceneIndex) {
    const nav = document.querySelector("[data-scene-nav]");
    if (!nav) {
      return;
    }

    nav.textContent = "";
    nav.append(navLink("../index.html", "Index"));

    const previous = story.scenes[sceneIndex - 1];
    const next = story.scenes[sceneIndex + 1];

    if (previous) {
      nav.append(navLink(fileName(previous.page), "Previous"));
    }
    if (next) {
      nav.append(navLink(fileName(next.page), "Next"));
    }
  }

  function navLink(href, text) {
    const link = el("a", "nav-button", text);
    link.href = href;
    return link;
  }

  function fileName(path) {
    return String(path).split("/").pop();
  }

  function renderSections(sceneSections) {
    const panel = document.querySelector("[data-script-panel]");
    if (!panel) {
      return;
    }

    panel.textContent = "";
    sceneSections.forEach((section) => {
      const node = el("section", "story-section");
      node.tabIndex = 0;
      node.dataset.bg = section.background || "index";
      node.dataset.audio = section.audio || "silence";

      node.append(el("p", "", section.text || ""));
      panel.append(node);
    });
  }

  function renderStatusPanel() {
    const status = document.querySelector("[data-status-panel]");
    if (!status) {
      return;
    }

    status.textContent = "";

    const audioButton = el("button", "audio-toggle", "Audio on");
    audioButton.type = "button";
    audioButton.setAttribute("aria-pressed", "true");
    audioButton.dataset.audioToggle = "";

    const current = el("span", "status-value");
    current.setAttribute("data-current-section", "");

    status.append(audioButton, current);
  }

  function textForSection(section) {
    const text = section.querySelector("p");
    const value = text ? text.textContent.trim() : "";
    return value.length > 52 ? `${value.slice(0, 52)}...` : value || "Selected section";
  }

  function selectSection(index, options = {}) {
    if (!sections.length) {
      return;
    }

    activeIndex = Math.max(0, Math.min(index, sections.length - 1));
    const active = sections[activeIndex];

    sections.forEach((section, sectionIndex) => {
      const isActive = sectionIndex === activeIndex;
      section.classList.toggle("is-active", isActive);
      section.setAttribute("aria-current", isActive ? "true" : "false");
    });

    applyBackground(active.dataset.bg);

    document.querySelector("[data-current-section]").textContent = textForSection(active);

    if (audioEnabled && audioUnlocked) {
      playTheme(active.dataset.audio);
    }

    if (options.scroll !== false) {
      active.scrollIntoView({ block: "center", behavior: options.behavior || "smooth" });
    }
  }

  function stopAudio() {
    if (audioPlayer) {
      audioPlayer.pause();
    }
  }

  function playTheme(themeName) {
    const theme = audioThemes[themeName] || audioThemes.silence;
    const file = theme && theme.file ? theme.file.trim() : "none";

    if (!theme || !file || file.toLowerCase() === "none") {
      activeAudioId = themeName || "";
      stopAudio();
      return;
    }

    if (!audioPlayer) {
      audioPlayer = new Audio();
      audioPlayer.loop = true;
      audioPlayer.preload = "auto";
    }

    if (activeAudioId !== themeName) {
      audioPlayer.pause();
      audioPlayer.src = assetPath(file);
      audioPlayer.currentTime = 0;
      activeAudioId = themeName;
    }

    audioPlayer.play().catch(() => {
      audioUnlocked = false;
    });
  }

  function wireSceneInteractions() {
    sections = Array.from(document.querySelectorAll(".story-section"));
    const audioButton = document.querySelector("[data-audio-toggle]");

    sections.forEach((section, index) => {
      section.addEventListener("click", () => selectSection(index));
      section.addEventListener("focus", () => {
        if (ignoreNextFocus) {
          ignoreNextFocus = false;
          return;
        }
        selectSection(index, { behavior: "auto" });
      });
      section.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectSection(index);
        }
      });
    });

    document.addEventListener("pointerdown", unlockAudio, { capture: true, once: true });
    document.addEventListener("keydown", unlockAudio, { capture: true, once: true });

    document.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        if (activeIndex === sections.length - 1) {
          goToAdjacentScene(1);
          return;
        }
        selectSection(activeIndex + 1);
        ignoreNextFocus = true;
        sections[activeIndex].focus({ preventScroll: true });
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        if (activeIndex === 0) {
          goToAdjacentScene(-1);
          return;
        }
        selectSection(activeIndex - 1);
        ignoreNextFocus = true;
        sections[activeIndex].focus({ preventScroll: true });
      }
    });

    window.addEventListener("scroll", () => {
      if (scrollFrame) {
        return;
      }

      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        selectCenteredSection();
      });
    }, { passive: true });

    if (audioButton) {
      audioButton.addEventListener("click", async () => {
        audioEnabled = !audioEnabled;
        audioButton.setAttribute("aria-pressed", String(audioEnabled));
        audioButton.textContent = audioEnabled ? "Audio on" : "Audio off";

        if (audioEnabled) {
          await unlockAudio();
          playTheme(sections[activeIndex].dataset.audio);
        } else {
          stopAudio();
        }
      });
    }
  }

  async function unlockAudio() {
    if (!audioEnabled || audioUnlocked) {
      return;
    }

    audioUnlocked = true;
    playTheme(sections[activeIndex].dataset.audio);
  }

  function assetPath(path) {
    try {
      const base = window.PLAIN_VN_ASSET_BASE || document.baseURI;
      return new URL(path, base).href;
    } catch (error) {
      return path;
    }
  }

  function goToAdjacentScene(direction) {
    const target = story.scenes[currentSceneIndex + direction];
    if (!target || !target.page) {
      return;
    }

    stopAudio();
    window.location.href = fileName(target.page);
  }

  function selectCenteredSection() {
    if (!sections.length) {
      return;
    }

    const viewportCenter = window.innerHeight / 2;
    let closestIndex = activeIndex;
    let closestDistance = Infinity;

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const distance = Math.abs(sectionCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeIndex) {
      selectSection(closestIndex, { scroll: false });
    }
  }

  if (document.body.dataset.page === "index") {
    renderIndex();
  } else {
    renderScene();
  }
})();
