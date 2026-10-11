import { useEffect, useRef, useState } from "react";
import {
  Aperture,
  ImagePlus,
  Play,
  Pause,
  Plus,
  Trash2,
  Download,
  Type,
  Layers,
  Sparkles,
  ZoomIn,
  MoveHorizontal,
  Film,
  Save,
  Upload,
  RotateCw,
  Maximize2,
  Clapperboard,
  Settings2,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Camera,
  Repeat,
} from "lucide-react";

type Motion =
  | "none"
  | "left"
  | "right"
  | "up"
  | "down"
  | "push"
  | "pull"
  | "orbit";

interface Scene {
  id: string;
  name: string;
  image: string;
  duration: number;
  text: string;
  motion: Motion;
  zoom: number;
  rotation: number;
  smoothness: number;
  brightness: number;
  contrast: number;
  textSize: number;
  textPosition: "top" | "center" | "bottom";
}

interface Project {
  name: string;
  scenes: Scene[];
  version: number;
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const makeScene = (index: number): Scene => ({
  id: uid(),
  name: `Scene ${index + 1}`,
  image: "",
  duration: 5,
  text: "",
  motion: "push",
  zoom: 1.2,
  rotation: 0,
  smoothness: 90,
  brightness: 100,
  contrast: 100,
  textSize: 28,
  textPosition: "bottom",
});

const defaultProjectName = "Untitled Film";

const styles = `
:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  background: #05070d;
  color: #e8edf6;
  font-synthesis: none;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-width: 320px;
  background: #05070d;
}

button, input, textarea, select { font: inherit; }
button { cursor: pointer; }

button:focus-visible, input:focus-visible,
textarea:focus-visible, select:focus-visible {
  outline: 2px solid #57d5ff;
  outline-offset: 3px;
}

.cs-app {
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 50% 0%, #101b30 0%, transparent 45%),
    #05070d;
  padding-bottom: 35px;
}

.cs-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 17px;
  border-bottom: 1px solid #20293a;
  background: rgba(5, 7, 13, .94);
  backdrop-filter: blur(18px);
}

.cs-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.cs-logo {
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #64ddff;
  border: 1px solid #234e71;
  border-radius: 13px;
  background: linear-gradient(135deg, #11253d, #070c16);
}

.cs-brand h1 {
  font-size: 13px;
  letter-spacing: 1.2px;
  margin: 0;
}

.cs-brand p {
  font-size: 9px;
  letter-spacing: 2px;
  color: #7b8ba6;
  margin: 5px 0 0;
}

.cs-icon-btn, .cs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #303b50;
  background: #101725;
  color: #dce7f6;
  border-radius: 10px;
  padding: 10px 12px;
}

.cs-icon-btn { width: 40px; height: 40px; padding: 0; }

.cs-btn.primary {
  color: #041019;
  border-color: #63d8ff;
  background: #63d8ff;
  font-weight: 800;
}

.cs-btn.danger {
  color: #ff9aa9;
  border-color: #633040;
  background: #21121c;
}

.cs-btn:disabled { opacity: .35; cursor: not-allowed; }

.cs-projectbar {
  padding: 16px;
  border-bottom: 1px solid #20293a;
}

.cs-label {
  color: #7888a1;
  font-size: 9px;
  letter-spacing: 1.8px;
  text-transform: uppercase;
}

.cs-project-title {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
}

.cs-project-title input {
  flex: 1;
  min-width: 0;
  color: #edf4ff;
  background: transparent;
  border: 0;
  font-size: 18px;
  font-weight: 700;
  outline: none;
}

.cs-layout {
  width: min(100%, 1150px);
  margin: 0 auto;
  padding: 15px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.cs-panel {
  min-width: 0;
  border: 1px solid #273247;
  border-radius: 15px;
  background: linear-gradient(150deg, #0b111d, #070b13);
  overflow: hidden;
}

.cs-panel-head {
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #20293a;
}

.cs-panel-head h2 {
  margin: 0;
  font-size: 11px;
  letter-spacing: 1.3px;
  font-weight: 800;
}

.cs-panel-body { padding: 14px; }

.cs-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #6ee7b7;
  font-size: 9px;
  letter-spacing: 1.2px;
}

.cs-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #49e0a2;
}

.cs-preview-wrap {
  padding: 12px;
  background: radial-gradient(ellipse, #17283d, #080c15 75%);
}

.cs-preview {
  position: relative;
  width: min(100%, 390px);
  aspect-ratio: 9 / 16;
  max-height: 66vh;
  margin: auto;
  overflow: hidden;
  border: 5px solid #303c51;
  border-radius: 17px;
  background:
    radial-gradient(ellipse at center, #102039, #02040a 70%);
  box-shadow: 0 15px 55px #0009;
  isolation: isolate;
}

.cs-preview-image {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  object-fit: cover;
  will-change: transform;
}

.cs-preview-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,.18),
    transparent 30%,
    transparent 55%,
    rgba(0,0,0,.76)
  );
  pointer-events: none;
}

.cs-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  text-align: center;
  padding: 24px;
  color: #6bdfff;
}

.cs-empty strong {
  color: #e6efff;
  font-size: 11px;
  letter-spacing: 1.7px;
}

.cs-empty span { color: #8494af; font-size: 12px; }

.cs-scene-tag {
  position: absolute;
  left: 12px;
  top: 12px;
  background: #070c15b8;
  color: #c7d7ed;
  padding: 6px 8px;
  font-size: 9px;
  letter-spacing: 1px;
  border: 1px solid #ffffff20;
  border-radius: 5px;
}

.cs-overlay {
  position: absolute;
  z-index: 3;
  left: 8%;
  right: 8%;
  color: white;
  text-align: center;
  font-family: Georgia, serif;
  text-shadow: 0 3px 12px #000;
  overflow-wrap: anywhere;
  pointer-events: none;
}

.cs-timeline-controls {
  padding: 13px;
  border-top: 1px solid #222d40;
}

.cs-playrow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cs-play {
  width: 40px;
  height: 40px;
  border: 1px solid #236183;
  background: #0b2033;
  color: #63d8ff;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.cs-time {
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  color: #9cacc3;
}

.cs-range {
  width: 100%;
  accent-color: #60d7ff;
  cursor: pointer;
}

.cs-timeline-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 12px;
}

.cs-scene-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 1px 9px;
}

.cs-scene-card {
  position: relative;
  flex: 0 0 94px;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  padding: 0;
  border: 1px solid #344056;
  border-radius: 10px;
  background: #0a1120;
}

.cs-scene-card.active {
  border: 2px solid #5bd9ff;
  box-shadow: 0 0 0 2px #5bd9ff22;
}

.cs-scene-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cs-scene-card .cs-thumb-empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: #64748b;
}

.cs-thumb-number, .cs-thumb-duration {
  position: absolute;
  padding: 4px 5px;
  background: #050a13cc;
  color: #e6efff;
  border-radius: 4px;
  font-size: 9px;
}

.cs-thumb-number { top: 5px; left: 5px; }
.cs-thumb-duration { bottom: 5px; right: 5px; }

.cs-add-card {
  flex: 0 0 94px;
  aspect-ratio: 3 / 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #67dfff;
  border: 1px dashed #344761;
  border-radius: 10px;
  background: #0a1120;
  font-size: 9px;
  letter-spacing: .8px;
}

.cs-tool-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 10px;
  border-bottom: 1px solid #20293a;
}

.cs-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  padding: 12px 3px;
  border: 1px solid transparent;
  background: transparent;
  color: #8594ac;
  border-radius: 9px;
  font-size: 10px;
}

.cs-tab.active {
  color: #64dcff;
  border-color: #244c6b;
  background: #102237;
}

.cs-field { margin-bottom: 20px; }
.cs-field:last-child { margin-bottom: 0; }

.cs-field label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #9aabc4;
  font-size: 9px;
  letter-spacing: 1.1px;
  text-transform: uppercase;
}

.cs-field input[type="text"],
.cs-field input[type="number"],
.cs-field textarea,
.cs-field select {
  width: 100%;
  color: #e5edf9;
  background: #0c1321;
  border: 1px solid #303d54;
  border-radius: 9px;
  padding: 12px;
  font-size: 12px;
}

.cs-field textarea { resize: vertical; min-height: 95px; }
.cs-field input[type="range"] { width: 100%; accent-color: #60d7ff; }

.cs-motion-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.cs-motion {
  min-height: 42px;
  padding: 9px 5px;
  border: 1px solid #303d54;
  border-radius: 9px;
  color: #a9b8ce;
  background: #121a29;
  font-size: 10px;
}

.cs-motion.active {
  color: #64dcff;
  border-color: #2b789c;
  background: #10263a;
}

.cs-divider {
  height: 1px;
  background: #222d40;
  margin: 20px 0;
}

.cs-engine {
  padding: 14px;
  border: 1px solid #303e52;
  border-radius: 11px;
  background: #060b13;
}

.cs-engine strong {
  display: block;
  margin: 10px 0 7px;
  color: #55e2a7;
  font-size: 13px;
  letter-spacing: 1px;
}

.cs-engine p {
  margin: 0;
  color: #7889a3;
  font-size: 9px;
  letter-spacing: 1px;
}

.cs-message {
  position: fixed;
  z-index: 100;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - 30px);
  padding: 12px 17px;
  border: 1px solid #33526a;
  border-radius: 11px;
  background: #101e30;
  color: #dff6ff;
  box-shadow: 0 8px 35px #0009;
  font-size: 12px;
}

.cs-footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 15px;
  color: #65758e;
  font-size: 8px;
  letter-spacing: 1px;
  border-top: 1px solid #20293a;
}

.cs-button-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cs-button-row > button { flex: 1; }

@media (min-width: 850px) {
  .cs-layout {
    grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr);
    align-items: start;
  }

  .cs-editor { position: sticky; top: 86px; }

  .cs-preview { max-height: 70vh; }

  .cs-projectbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
}

@media (max-width: 380px) {
  .cs-header { padding: 12px; }
  .cs-brand h1 { font-size: 11px; }
  .cs-layout { padding: 9px; gap: 10px; }
  .cs-panel-body { padding: 11px; }
  .cs-preview-wrap { padding: 8px; }
}
`;

export default function App() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selected, setSelected] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [projectName, setProjectName] = useState(defaultProjectName);
  const [activeTab, setActiveTab] = useState<
    "scenes" | "typography" | "motion"
  >("scenes");
  const [notice, setNotice] = useState("");
  const [loop, setLoop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  const current = scenes.find((scene) => scene.id === selected);

  const total = scenes.reduce(
    (sum, scene) => sum + scene.duration,
    0
  );

  const showNotice = (message: string) => {
    setNotice(message);

    if (noticeTimer.current !== undefined) {
      window.clearTimeout(noticeTimer.current);
    }

    noticeTimer.current = window.setTimeout(() => {
      setNotice("");
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (noticeTimer.current !== undefined) {
        window.clearTimeout(noticeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!playing || total <= 0) return;

    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      setTime((previous) => {
        const next = previous + delta;

        if (next >= total) {
          if (loop) {
            return next % total;
          }

          return total;
        }

        return next;
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [playing, total, loop]);

  useEffect(() => {
    if (playing && total > 0 && time >= total && !loop) {
      setPlaying(false);
    }
  }, [time, total, playing, loop]);

  const addScene = () => {
    const scene = makeScene(scenes.length);

    setScenes((previous) => [...previous, scene]);
    setSelected(scene.id);
    setTime(0);
    setPlaying(false);
    showNotice("New scene created");
  };

  const updateScene = (patch: Partial<Scene>) => {
    if (!current) return;

    setScenes((previous) =>
      previous.map((scene) =>
        scene.id === current.id
          ? { ...scene, ...patch }
          : scene
      )
    );
  };

  const deleteScene = () => {
    if (!current) return;

    const index = scenes.findIndex(
      (scene) => scene.id === current.id
    );

    const remaining = scenes.filter(
      (scene) => scene.id !== current.id
    );

    setScenes(remaining);
    setSelected(
      remaining[Math.min(index, remaining.length - 1)]?.id ?? ""
    );
    setTime(0);
    setPlaying(false);
    showNotice("Scene deleted");
  };

  const duplicateScene = () => {
    if (!current) return;

    const copy: Scene = {
      ...current,
      id: uid(),
      name: `${current.name} Copy`,
    };

    const index = scenes.findIndex(
      (scene) => scene.id === current.id
    );

    const next = [...scenes];
    next.splice(index + 1, 0, copy);

    setScenes(next);
    setSelected(copy.id);
    showNotice("Scene duplicated");
  };

  const importImages = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) return;

    const validFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (!validFiles.length) {
      showNotice("Choose image files");
      event.target.value = "";
      return;
    }

    const imported: Scene[] = [];

    for (const file of validFiles) {
      const image = await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("Image could not be read"));

          reader.onerror = () =>
            reject(new Error("Image could not be read"));

          reader.readAsDataURL(file);
        }
      ).catch(() => "");

      if (image) {
        imported.push({
          ...makeScene(scenes.length + imported.length),
          name: file.name.replace(/\.[^.]+$/, ""),
          image,
        });
      }
    }

    if (imported.length) {
      setScenes((previous) => [...previous, ...imported]);
      setSelected(imported[0].id);
      setTime(0);
      setPlaying(false);
      showNotice(`${imported.length} image scene(s) imported`);
    }

    event.target.value = "";
  };

  const seekTo = (seconds: number) => {
    const next = clamp(seconds, 0, total);
    setTime(next);

    let elapsed = 0;

    for (const scene of scenes) {
      if (next < elapsed + scene.duration) {
        setSelected(scene.id);
        return;
      }

      elapsed += scene.duration;
    }

    if (scenes.length) {
      setSelected(scenes[scenes.length - 1].id);
    }
  };

  const togglePlayback = () => {
    if (!scenes.length || total <= 0) {
      showNotice("Add a scene before playing");
      return;
    }

    if (playing) {
      setPlaying(false);
      return;
    }

    if (time >= total) setTime(0);

    setPlaying(true);
  };

  const saveProject = () => {
    const project: Project = {
      name: projectName,
      scenes,
      version: 1,
    };

    const blob = new Blob(
      [JSON.stringify(project, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `${projectName.trim().replace(/[^\w-]+/g, "-") || "cinematic-project"}.json`;

    anchor.click();
    URL.revokeObjectURL(url);

    showNotice("Project JSON downloaded");
  };

  const loadProject = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const project = JSON.parse(
        await file.text()
      ) as Project;

      if (
        !project ||
        !Array.isArray(project.scenes) ||
        !project.scenes.every(
          (scene) =>
            typeof scene.id === "string" &&
            typeof scene.duration === "number"
        )
      ) {
        throw new Error("Invalid project");
      }

      setScenes(project.scenes);
      setSelected(project.scenes[0]?.id ?? "");
      setProjectName(project.name || defaultProjectName);
      setTime(0);
      setPlaying(false);
      showNotice("Project loaded successfully");
    } catch {
      showNotice("Invalid project file");
    }

    event.target.value = "";
  };

  const exportFrame = () => {
    const preview = document.querySelector(
      ".cs-preview"
    ) as HTMLElement | null;

    if (!preview) return;

    showNotice(
      "Use your browser screenshot tool to capture the preview"
    );
  };

  const motionTransform = (() => {
    if (!current) return "scale(1)";

    const zoom = current.zoom;

    switch (current.motion) {
      case "left":
        return `translateX(-3%) scale(${zoom})`;
      case "right":
        return `translateX(3%) scale(${zoom})`;
      case "up":
        return `translateY(-3%) scale(${zoom})`;
      case "down":
        return `translateY(3%) scale(${zoom})`;
      case "pull":
        return `scale(${1 + (zoom - 1) * 0.4})`;
      case "orbit":
        return `rotate(${current.rotation}deg) scale(${zoom})`;
      case "push":
        return `scale(${zoom})`;
      default:
        return `scale(1)`;
    }
  })();

  const imageStyle: React.CSSProperties = {
    transform: motionTransform,
    filter: current
      ? `brightness(${current.brightness}%) contrast(${current.contrast}%)`
      : "none",
    transition: `transform ${Math.max(
      0.2,
      current?.smoothness ?? 90
    ) / 100}s ease-in-out`,
  };

  const textPositionStyle: React.CSSProperties = {
    top:
      current?.textPosition === "top"
        ? "12%"
        : current?.textPosition === "center"
          ? "45%"
          : "auto",
    bottom:
      current?.textPosition === "bottom"
        ? "10%"
        : "auto",
    fontSize: `${current?.textSize ?? 28}px`,
  };

  return (
    <>
      <style>{styles}</style>

      <div className="cs-app">
        <header className="cs-header">
          <div className="cs-brand">
            <div className="cs-logo">
              <Aperture size={24} />
            </div>

            <div>
              <h1>CINEMATIC STUDIO</h1>
              <p>CREATIVE MOTION ENGINE</p>
            </div>
          </div>

          <div className="cs-button-row">
            <button
              className="cs-icon-btn"
              title="Import images"
              onClick={() => fileRef.current?.click()}
            >
              <Plus size={21} />
            </button>

            <button
              className="cs-icon-btn"
              title="Project settings"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </header>

        <section className="cs-projectbar">
          <div>
            <div className="cs-label">
              Project / {String(scenes.length).padStart(3, "0")}
            </div>

            <div className="cs-project-title">
              <input
                value={projectName}
                onChange={(event) =>
                  setProjectName(event.target.value)
                }
                aria-label="Project name"
                maxLength={100}
              />
            </div>
          </div>

          <div className="cs-button-row">
            <button className="cs-btn primary" onClick={saveProject}>
              <Save size={15} />
              Save Project
            </button>

            <button
              className="cs-btn"
              onClick={() => projectRef.current?.click()}
            >
              <Upload size={15} />
              Load
            </button>
          </div>
        </section>

        <div className="cs-layout">
          <main className="cs-panel">
            <div className="cs-panel-head">
              <h2>
                <Aperture
                  size={14}
                  style={{ verticalAlign: "middle", marginRight: 7 }}
                />
                LIVE COMPOSITION
              </h2>

              <span className="cs-label">9:16 / VERTICAL</span>
            </div>

            <div className="cs-preview-wrap">
              <div className="cs-preview">
                {current?.image ? (
                  <img
                    className="cs-preview-image"
                    src={current.image}
                    alt={current.name}
                    style={imageStyle}
                  />
                ) : null}

                {!current?.image && (
                  <div className="cs-empty">
                    <ImagePlus size={44} />

                    <strong>
                      {current
                        ? "IMPORT AN IMAGE"
                        : "CREATE YOUR FIRST SCENE"}
                    </strong>

                    <span>
                      {current
                        ? "Choose an image to animate"
                        : "Import an image to begin"}
                    </span>

                    <button
                      className="cs-btn primary"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={15} />
                      Import Image
                    </button>
                  </div>
                )}

                {current?.image && (
                  <>
                    <div className="cs-preview-shade" />

                    <div className="cs-scene-tag">
                      {current.name.toUpperCase()}
                    </div>

                    {current.text && (
                      <div
                        className="cs-overlay"
                        style={textPositionStyle}
                      >
                        {current.text}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="cs-timeline-controls">
              <div className="cs-playrow">
                <button
                  className="cs-play"
                  onClick={togglePlayback}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <Pause size={17} />
                  ) : (
                    <Play size={17} />
                  )}
                </button>

                <span className="cs-time">
                  {time.toFixed(1)}s
                </span>

                <input
                  className="cs-range"
                  type="range"
                  min="0"
                  max={Math.max(total, 0.1)}
                  step="0.1"
                  value={Math.min(time, total)}
                  onChange={(event) =>
                    seekTo(Number(event.target.value))
                  }
                  aria-label="Timeline position"
                />

                <span className="cs-time">
                  {total.toFixed(1)}s
                </span>
              </div>

              <div className="cs-timeline-head">
                <div>
                  <Film
                    size={13}
                    style={{ verticalAlign: "middle", marginRight: 6 }}
                  />
                  <span className="cs-label">Timeline</span>
                  <span className="cs-label" style={{ marginLeft: 8 }}>
                    {scenes.length} scenes
                  </span>
                </div>

                <button
                  className="cs-btn"
                  onClick={addScene}
                  style={{ padding: "7px 10px" }}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              <div className="cs-scene-list">
                {scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    className={`cs-scene-card ${
                      scene.id === selected ? "active" : ""
                    }`}
                    onClick={() => {
                      setSelected(scene.id);
                      setPlaying(false);

                      let start = 0;

                      for (let i = 0; i < index; i++) {
                        start += scenes[i].duration;
                      }

                      setTime(start);
                    }}
                    aria-label={`Select ${scene.name}`}
                  >
                    {scene.image ? (
                      <img src={scene.image} alt="" />
                    ) : (
                      <div className="cs-thumb-empty">
                        <ImagePlus size={25} />
                      </div>
                    )}

                    <span className="cs-thumb-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="cs-thumb-duration">
                      {scene.duration}s
                    </span>
                  </button>
                ))}

                <button
                  className="cs-add-card"
                  onClick={() => fileRef.current?.click()}
                >
                  <Plus size={24} />
                  IMPORT SCENE
                </button>
              </div>
            </div>
          </main>

          <aside className="cs-panel cs-editor">
            <div className="cs-tool-tabs">
              <button
                className={`cs-tab ${
                  activeTab === "scenes" ? "active" : ""
                }`}
                onClick={() => setActiveTab("scenes")}
              >
                <Layers size={20} />
                Scenes
              </button>

              <button
                className={`cs-tab ${
                  activeTab === "typography" ? "active" : ""
                }`}
                onClick={() => setActiveTab("typography")}
              >
                <Type size={20} />
                Typography
              </button>

              <button
                className={`cs-tab ${
                  activeTab === "motion" ? "active" : ""
                }`}
                onClick={() => setActiveTab("motion")}
              >
                <Sparkles size={20} />
                Motion
              </button>
            </div>

            <div className="cs-panel-body">
              {!current ? (
                <div className="cs-empty" style={{ position: "relative", minHeight: 220 }}>
                  <Layers size={36} />
                  <strong>NO SCENE SELECTED</strong>
                  <span>Create a scene or import an image.</span>

                  <div className="cs-button-row">
                    <button className="cs-btn primary" onClick={addScene}>
                      <Plus size={16} />
                      New Scene
                    </button>

                    <button
                      className="cs-btn"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={16} />
                      Import
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === "scenes" && (
                    <>
                      <div className="cs-field">
                        <label>Scene Name</label>

                        <input
                          type="text"
                          value={current.name}
                          onChange={(event) =>
                            updateScene({ name: event.target.value })
                          }
                          maxLength={100}
                        />
                      </div>

                      <div className="cs-field">
                        <label>
                          Scene Duration
                          <span>{current.duration}s</span>
                        </label>

                        <input
                          type="range"
                          min="1"
                          max="30"
                          step="1"
                          value={current.duration}
                          onChange={(event) => {
                            updateScene({
                              duration: Number(event.target.value),
                            });
                          }}
                        />
                      </div>

                      <div className="cs-field">
                        <label>Camera Motion</label>

                        <div className="cs-motion-grid">
                          {(
                            [
                              ["none", "Static"],
                              ["left", "← Left"],
                              ["right", "→ Right"],
                              ["up", "↑ Up"],
                              ["down", "↓ Down"],
                              ["push", "Push In"],
                              ["pull", "Pull Out"],
                              ["orbit", "Orbit"],
                            ] as [Motion, string][]
                          ).map(([motion, label]) => (
                            <button
                              key={motion}
                              className={`cs-motion ${
                                current.motion === motion ? "active" : ""
                              }`}
                              onClick={() =>
                                updateScene({ motion })
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="cs-field">
                        <label>
                          Camera Zoom
                          <span>{current.zoom.toFixed(2)}×</span>
                        </label>

                        <input
                          type="range"
                          min="1"
                          max="2.5"
                          step=".05"
                          value={current.zoom}
                          onChange={(event) =>
                            updateScene({
                              zoom: Number(event.target.value),
                            })
                          }
                        />
                      </div>

                      <div className="cs-field">
                        <label>
                          Smoothness
                          <span>{current.smoothness}%</span>
                        </label>

                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={current.smoothness}
                          onChange={(event) =>
                            updateScene({
                              smoothness: Number(event.target.value),
                            })
                          }
                        />
                      </div>

                      <div className="cs-field">
                        <label>
                          Rotation
                          <span>{current.rotation}°</span>
                        </label>

                        <input
                          type="range"
                          min="-30"
                          max="30"
                          value={current.rotation}
                          onChange={(event) =>
                            updateScene({
                              rotation: Number(event.target.value),
                            })
                          }
                        />
                      </div>

                      <div className="cs-field">
                        <label>
                          Brightness
                          <span>{current.brightness}%</span>
                        </label>

                        <input
                          type="range"
                          min="40"
                          max="160"
                          value={current.brightness}
                          onChange={(event) =>
                            updateScene({
                              brightness: Number(event.target.value),
                            })
                          }
                        />
                      </div>

                      <div className="cs-field">
                        <label>
                          Contrast
                          <span>{current.contrast}%</span>
                        </label>

                        <input
                          type="range"
                          min="50"
                          max="180"
                          value={current.contrast}
                          onChange={(event) =>
                            updateScene({
                              contrast: Number(event.target.value),
                            })
                          }
                        />
                      </div>
                    </>
                  )}

                  {activeTab === "typography" && (
                    <>
                      <div className="cs-field">
                        <label>Overlay Text</label>

                        <textarea
                          value={current.text}
                          onChange={(event) =>
                            updateScene({ text: event.target.value })
                          }
                          placeholder="Write your cinematic caption..."
                          maxLength={500}
                        />
                      </div>

                      <div className="cs-field">
                        <label>
                          Font Size
                          <span>{current.textSize}px</span>
                        </label>

                        <input
                          type="range"
                          min="12"
                          max="60"
                          value={current.textSize}
                          onChange={(event) =>
                            updateScene({
                              textSize: Number(event.target.value),
                            })
                          }
                        />
                      </div>

                      <div className="cs-field">
                        <label>Text Position</label>

                        <select
                          value={current.textPosition}
                          onChange={(event) =>
                            updateScene({
                              textPosition: event.target.value as
                                | "top"
                                | "center"
                                | "bottom",
                            })
                          }
                        >
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      </div>

                      <button
                        className="cs-btn"
                        onClick={() =>
                          updateScene({
                            text: "",
                            textSize: 28,
                            textPosition: "bottom",
                          })
                        }
                      >
                        <Trash2 size={15} />
                        Clear Typography
                      </button>
                    </>
                  )}

                  {activeTab === "motion" && (
                    <>
                      <div className="cs-engine">
                        <span className="cs-status">
                          <span className="cs-dot" />
                          MOTION ENGINE
                        </span>

                        <strong>READY</strong>

                        <p>CLIENT-SIDE PREVIEW</p>
                      </div>

                      <div className="cs-divider" />

                      <div className="cs-field">
                        <label>Motion Presets</label>

                        <div className="cs-motion-grid">
                          <button
                            className="cs-motion"
                            onClick={() =>
                              updateScene({
                                motion: "push",
                                zoom: 1.45,
                                rotation: 0,
                                smoothness: 90,
                              })
                            }
                          >
                            Epic Reveal
                          </button>

                          <button
                            className="cs-motion"
                            onClick={() =>
                              updateScene({
                                motion: "pull",
                                zoom: 1.5,
                                rotation: 0,
                                smoothness: 90,
                              })
                            }
                          >
                            Dream Sequence
                          </button>

                          <button
                            className="cs-motion"
                            onClick={() =>
                              updateScene({
                                motion: "orbit",
                                zoom: 1.35,
                                rotation: 5,
                                smoothness: 80,
                              })
                            }
                          >
                            Orbit Shot
                          </button>

                          <button
                            className="cs-motion"
                            onClick={() =>
                              updateScene({
                                motion: "up",
                                zoom: 1.25,
                                rotation: 0,
                                smoothness: 95,
                              })
                            }
                          >
                            Divine Rise
                          </button>
                        </div>
                      </div>

                      <div className="cs-field">
                        <label>Loop Playback</label>

                        <button
                          className={`cs-motion ${
                            loop ? "active" : ""
                          }`}
                          onClick={() => setLoop(!loop)}
                          style={{ width: "100%" }}
                        >
                          <Repeat
                            size={15}
                            style={{
                              verticalAlign: "middle",
                              marginRight: 7,
                            }}
                          />
                          {loop ? "Loop Enabled" : "Enable Loop"}
                        </button>
                      </div>

                      <div className="cs-field">
                        <label>Scene Operations</label>

                        <div className="cs-button-row">
                          <button
                            className="cs-btn"
                            onClick={duplicateScene}
                          >
                            <Copy size={15} />
                            Duplicate
                          </button>

                          <button
                            className="cs-btn"
                            onClick={() =>
                              fileRef.current?.click()
                            }
                          >
                            <ImagePlus size={15} />
                            Replace Image
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="cs-divider" />

                  <div className="cs-button-row">
                    <button
                      className="cs-btn"
                      onClick={duplicateScene}
                    >
                      <Copy size={15} />
                      Duplicate
                    </button>

                    <button
                      className="cs-btn danger"
                      onClick={deleteScene}
                    >
                      <Trash2 size={15} />
                      Delete Scene
                    </button>
                  </div>

                  <div className="cs-divider" />

                  <div className="cs-engine">
                    <span className="cs-status">
                      <span className="cs-dot" />
                      RENDER ENGINE
                    </span>

                    <strong>READY</strong>

                    <p>
                      CLIENT-SIDE PREVIEW · 1080 × 1920 TARGET
                    </p>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>

        {showSettings && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 80,
              background: "#000b",
              display: "grid",
              placeItems: "center",
              padding: 20,
            }}
            onClick={() => setShowSettings(false)}
          >
            <div
              className="cs-panel"
              style={{ width: "100%", maxWidth: 400 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="cs-panel-head">
                <h2>PROJECT SETTINGS</h2>

                <button
                  className="cs-icon-btn"
                  onClick={() => setShowSettings(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="cs-panel-body">
                <div className="cs-field">
                  <label>Project Name</label>

                  <input
                    type="text"
                    value={projectName}
                    onChange={(event) =>
                      setProjectName(event.target.value)
                    }
                  />
                </div>

                <div className="cs-field">
                  <label>Project Statistics</label>

                  <p className="cs-label">
                    {scenes.length} scenes · {total.toFixed(1)} seconds
                  </p>
                </div>

                <div className="cs-button-row">
                  <button
                    className="cs-btn primary"
                    onClick={() => {
                      saveProject();
                      setShowSettings(false);
                    }}
                  >
                    <Download size={15} />
                    Export Project
                  </button>

                  <button
                    className="cs-btn"
                    onClick={() => {
                      projectRef.current?.click();
                      setShowSettings(false);
                    }}
                  >
                    <Upload size={15} />
                    Import Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={importImages}
        />

        <input
          ref={projectRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={loadProject}
        />

        <footer className="cs-footer">
          <span>● ENGINE ONLINE</span>
          <span>1080 × 1920 TARGET</span>
          <span>BUILD 0.2.0</span>
        </footer>

        {notice && (
          <div className="cs-message" role="status">
            <Check
              size={15}
              style={{ verticalAlign: "middle", marginRight: 8 }}
            />
            {notice}
          </div>
        )}
      </div>
    </>
  );
      }
