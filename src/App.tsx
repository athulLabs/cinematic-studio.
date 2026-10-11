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
  ZoomIn,
  MoveHorizontal,
  Film,
  Save,
  Upload,
  RotateCw,
  Maximize2,
  Clapperboard,
  Check,
  X,
} from "lucide-react";

import "./index.css";

type Motion = "left" | "right" | "up" | "down" | "none";

type Scene = {
  id: string;
  name: string;
  image: string;
  duration: number;
  zoom: number;
  motion: Motion;
  rotation: number;
  text: string;
  textColor: string;
  textSize: number;
  textPosition: number;
};

type Project = {
  name: string;
  scenes: Scene[];
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createScene = (): Scene => ({
  id: makeId(),
  name: "New Scene",
  image: "",
  duration: 5,
  zoom: 1,
  motion: "right",
  rotation: 0,
  text: "",
  textColor: "#ffffff",
  textSize: 28,
  textPosition: 78,
});

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function App() {
  const [projectName, setProjectName] = useState("Untitled Film");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selected, setSelected] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "scenes" | "typography" | "import"
  >("scenes");
  const [notice, setNotice] = useState("");
  const [showText, setShowText] = useState(true);
  const [ratio, setRatio] = useState<"portrait" | "landscape" | "square">(
    "portrait"
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);

  const current = scenes.find((scene) => scene.id === selected);

  const total = scenes.reduce(
    (sum, scene) => sum + scene.duration,
    0
  );

  const elapsedBeforeCurrent = scenes
    .slice(0, Math.max(0, scenes.findIndex((s) => s.id === selected)))
    .reduce((sum, scene) => sum + scene.duration, 0);

  const localTime = current
    ? clamp(time - elapsedBeforeCurrent, 0, current.duration)
    : 0;

  const progress = total > 0 ? (time / total) * 100 : 0;

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  useEffect(() => {
    if (!playing || total <= 0) return;

    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;

      setTime((previous) => {
        const next = previous + delta;

        if (next >= total) {
          setPlaying(false);
          return 0;
        }

        return next;
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [playing, total]);

  useEffect(() => {
    if (!scenes.length) {
      setSelected("");
      setTime(0);
      setPlaying(false);
      return;
    }

    if (!scenes.some((scene) => scene.id === selected)) {
      setSelected(scenes[0].id);
    }
  }, [scenes, selected]);

  const updateScene = (patch: Partial<Scene>) => {
    if (!current) return;

    setScenes((old) =>
      old.map((scene) =>
        scene.id === current.id ? { ...scene, ...patch } : scene
      )
    );
  };

  const addScene = () => {
    const scene = createScene();

    setScenes((old) => [...old, scene]);
    setSelected(scene.id);
    setPlaying(false);
    setTime(total);

    notify("Scene created");
  };

  const deleteScene = () => {
    if (!current) return;

    const remaining = scenes.filter(
      (scene) => scene.id !== current.id
    );

    setScenes(remaining);
    setSelected(remaining[0]?.id ?? "");
    setPlaying(false);
    setTime(0);

    notify("Scene deleted");
  };

  const importImages = async (files: FileList | null) => {
    if (!files?.length) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (!imageFiles.length) {
      notify("Please select image files");
      return;
    }

    const imported: Scene[] = [];

    for (const file of imageFiles) {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Image import failed"));

        reader.readAsDataURL(file);
      }).catch(() => "");

      if (!image) continue;

      imported.push({
        ...createScene(),
        name: file.name.replace(/\.[^.]+$/, ""),
        image,
      });
    }

    if (!imported.length) {
      notify("Unable to import images");
      return;
    }

    setScenes((old) => [...old, ...imported]);
    setSelected(imported[0].id);
    setActiveTab("scenes");
    setPlaying(false);
    setTime(0);

    notify(`${imported.length} image(s) imported`);
  };

  const saveProject = () => {
    const project: Project = {
      name: projectName,
      scenes,
    };

    try {
      const blob = new Blob(
        [JSON.stringify(project, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `${projectName || "cinematic-project"}.json`;
      anchor.click();

      URL.revokeObjectURL(url);

      notify("Project exported");
    } catch {
      notify("Unable to export project");
    }
  };

  const openProject = async (file: File) => {
    try {
      const project = JSON.parse(await file.text()) as Project;

      if (!Array.isArray(project.scenes)) {
        throw new Error("Invalid project");
      }

      const validScenes = project.scenes.filter(
        (scene) =>
          typeof scene.id === "string" &&
          typeof scene.image === "string" &&
          typeof scene.duration === "number"
      );

      setProjectName(project.name || "Imported Film");
      setScenes(validScenes);
      setSelected(validScenes[0]?.id ?? "");
      setTime(0);
      setPlaying(false);

      notify("Project opened");
    } catch {
      notify("Invalid project file");
    }
  };

  const jumpToScene = (sceneId: string) => {
    const index = scenes.findIndex((scene) => scene.id === sceneId);

    if (index < 0) return;

    const start = scenes
      .slice(0, index)
      .reduce((sum, scene) => sum + scene.duration, 0);

    setSelected(sceneId);
    setTime(start);
    setPlaying(false);
  };

  const seek = (value: number) => {
    const next = clamp(value, 0, total);

    setTime(next);

    let cursor = 0;

    for (const scene of scenes) {
      if (next < cursor + scene.duration) {
        setSelected(scene.id);
        return;
      }

      cursor += scene.duration;
    }

    if (scenes.length) {
      setSelected(scenes[scenes.length - 1].id);
    }
  };

  const exportCurrentFrame = async () => {
    if (!current?.image) {
      notify("Import an image first");
      return;
    }

    try {
      const image = new Image();
      image.src = current.image;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject();
      });

      const canvas = document.createElement("canvas");

      const width = ratio === "portrait" ? 1080 : 1920;
      const height = ratio === "landscape" ? 1080 : ratio === "square" ? 1080 : 1920;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Canvas unavailable");

      ctx.fillStyle = "#050811";
      ctx.fillRect(0, 0, width, height);

      const zoom = current.zoom;
      const scale = Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight
      ) * zoom;

      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;

      const movement = current.motion === "left"
        ? -localTime / Math.max(current.duration, 0.1)
        : current.motion === "right"
          ? localTime / Math.max(current.duration, 0.1)
          : 0;

      const offsetX = (width - drawWidth) / 2 - movement * width * 0.12;
      const offsetY = (height - drawHeight) / 2;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((current.rotation * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);

      ctx.drawImage(
        image,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );

      ctx.restore();

      const gradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,.65)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      if (showText && current.text) {
        ctx.fillStyle = current.textColor;
        ctx.textAlign = "center";
        ctx.font = `600 ${current.textSize * (height / 800)}px Arial`;
        ctx.fillText(
          current.text,
          width / 2,
          height * (current.textPosition / 100),
          width * 0.85
        );
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          notify("Frame export failed");
          return;
        }

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = `${current.name || "cinematic-frame"}.png`;
        anchor.click();

        URL.revokeObjectURL(url);
        notify("PNG frame exported");
      }, "image/png");
    } catch {
      notify("Could not export this image");
    }
  };

  const movementClass = current?.motion ?? "none";

  return (
    <main className="studio">
      <header className="cs-header">
        <div className="cs-brand">
          <div className="cs-logo">
            <Aperture size={22} />
          </div>

          <div className="brand-copy">
            <strong>CINEMATIC STUDIO</strong>
            <span>CREATIVE MOTION ENGINE</span>
          </div>
        </div>

        <button
          className="icon-button"
          onClick={addScene}
          aria-label="Add scene"
        >
          <Plus size={21} />
        </button>
      </header>

      <section className="project-bar">
        <div className="project-meta">
          <span className="eyebrow">PROJECT / 001</span>

          <input
            className="project-name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            aria-label="Project name"
          />
        </div>

        <div className="project-actions">
          <button className="primary-button" onClick={saveProject}>
            <Save size={15} />
            <span>SAVE PROJECT</span>
          </button>

          <button
            className="icon-button"
            onClick={() => projectRef.current?.click()}
            aria-label="Open project"
          >
            <Upload size={17} />
          </button>

          <input
            ref={projectRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) void openProject(file);

              event.target.value = "";
            }}
          />
        </div>
      </section>

      <div className="workspace">
        <aside className="sidebar">
          <button
            className={activeTab === "scenes" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveTab("scenes")}
          >
            <Layers size={19} />
            <span>Scenes</span>
          </button>

          <button
            className={
              activeTab === "typography" ? "nav-item active" : "nav-item"
            }
            onClick={() => setActiveTab("typography")}
          >
            <Type size={19} />
            <span>Type</span>
          </button>

          <button
            className={activeTab === "import" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setActiveTab("import");
              fileRef.current?.click();
            }}
          >
            <ImagePlus size={19} />
            <span>Import</span>
          </button>
        </aside>

        <section className="editor">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LIVE COMPOSITION</span>
              <h1>Cinematic Preview</h1>
            </div>

            <select
              className="ratio-select"
              value={ratio}
              onChange={(event) =>
                setRatio(event.target.value as typeof ratio)
              }
              aria-label="Canvas ratio"
            >
              <option value="portrait">9:16 / VERTICAL</option>
              <option value="landscape">16:9 / LANDSCAPE</option>
              <option value="square">1:1 / SQUARE</option>
            </select>
          </div>

          <div className={`preview-shell ratio-${ratio}`}>
            {current?.image ? (
              <div className="preview-stage">
                <img
                  key={current.id}
                  className={`preview-image motion-${movementClass}`}
                  src={current.image}
                  alt={current.name}
                  style={{
                    transform: `scale(${current.zoom}) rotate(${current.rotation}deg)`,
                    animationDuration: `${Math.max(current.duration, 0.1)}s`,
                    animationPlayState: playing ? "running" : "paused",
                  }}
                />

                <div className="preview-vignette" />

                <div className="preview-label">
                  SCENE {String(scenes.findIndex(s => s.id === selected) + 1).padStart(2, "0")}
                </div>

                {showText && current.text && (
                  <div
                    className="preview-caption"
                    style={{
                      color: current.textColor,
                      fontSize: `clamp(14px, ${current.textSize / 4}vw, ${current.textSize}px)`,
                      top: `${current.textPosition}%`,
                    }}
                  >
                    {current.text}
                  </div>
                )}

                <div className="camera-readout">
                  {current.zoom.toFixed(2)}×
                </div>
              </div>
            ) : (
              <button
                className="empty-preview"
                onClick={() => fileRef.current?.click()}
              >
                <div className="empty-icon">
                  <ImagePlus size={33} />
                </div>

                <strong>CREATE YOUR FIRST SCENE</strong>
                <span>Import an image to begin</span>

                <span className="empty-action">
                  <Upload size={15} /> IMPORT IMAGE
                </span>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              void importImages(event.target.files);
              event.target.value = "";
            }}
          />

          <div className="transport">
            <button
              className="play-button"
              onClick={() => {
                if (!scenes.length) {
                  fileRef.current?.click();
                  return;
                }

                if (time >= total) setTime(0);

                setPlaying((value) => !value);
              }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </button>

            <span className="time-readout">
              {time.toFixed(1)}s
            </span>

            <input
              className="transport-slider"
              type="range"
              min={0}
              max={Math.max(total, 0.1)}
              step={0.05}
              value={Math.min(time, total)}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Timeline position"
            />

            <span className="time-total">
              {total.toFixed(1)}s
            </span>
          </div>

          <section className="timeline">
            <div className="timeline-heading">
              <div className="heading-left">
                <Film size={15} />
                <span>TIMELINE</span>
                <span className="count-badge">
                  {scenes.length} SCENES
                </span>
              </div>

              <button className="small-button" onClick={addScene}>
                <Plus size={15} /> ADD
              </button>
            </div>

            {scenes.length ? (
              <div className="scene-strip">
                {scenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    className={
                      scene.id === selected
                        ? "scene-card selected"
                        : "scene-card"
                    }
                    onClick={() => jumpToScene(scene.id)}
                  >
                    <div className="scene-thumbnail">
                      {scene.image ? (
                        <img src={scene.image} alt="" />
                      ) : (
                        <ImagePlus size={23} />
                      )}

                      <span className="scene-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="scene-duration">
                        {scene.duration}s
                      </span>
                    </div>

                    <span className="scene-card-name">
                      {scene.name}
                    </span>
                  </button>
                ))}

                <button
                  className="import-scene-card"
                  onClick={() => fileRef.current?.click()}
                >
                  <Plus size={22} />
                  <span>IMPORT SCENE</span>
                </button>
              </div>
            ) : (
              <button
                className="timeline-empty"
                onClick={() => fileRef.current?.click()}
              >
                <Plus size={20} />
                IMPORT YOUR FIRST IMAGE
              </button>
            )}
          </section>

          {current && (
            <section className="scene-controls">
              <div className="controls-heading">
                <SparkleIcon />
                <span>SCENE CONTROLS</span>
              </div>

              <div className="property-group">
                <label htmlFor="sceneName">SCENE NAME</label>

                <input
                  id="sceneName"
                  className="text-input"
                  value={current.name}
                  onChange={(event) =>
                    updateScene({ name: event.target.value })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  <MoveHorizontal size={13} />
                  CAMERA MOTION
                </label>

                <div className="movement-grid">
                  {(
                    [
                      ["left", "← LEFT"],
                      ["right", "RIGHT →"],
                      ["up", "↑ UP"],
                      ["down", "↓ DOWN"],
                      ["none", "● STATIC"],
                    ] as [Motion, string][]
                  ).map(([motion, label]) => (
                    <button
                      key={motion}
                      className={
                        current.motion === motion
                          ? "motion-button active"
                          : "motion-button"
                      }
                      onClick={() => updateScene({ motion })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="property-group">
                <label>
                  <ZoomIn size={13} />
                  <span>CAMERA ZOOM</span>
                  <span className="value">{current.zoom.toFixed(2)}×</span>
                </label>

                <input
                  className="range-input"
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={current.zoom}
                  onChange={(event) =>
                    updateScene({ zoom: Number(event.target.value) })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  <Film size={13} />
                  <span>DURATION</span>
                  <span className="value">{current.duration}s</span>
                </label>

                <input
                  className="range-input"
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={current.duration}
                  onChange={(event) =>
                    updateScene({ duration: Number(event.target.value) })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  <RotateCw size={13} />
                  <span>ROTATION</span>
                  <span className="value">{current.rotation}°</span>
                </label>

                <input
                  className="range-input"
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={current.rotation}
                  onChange={(event) =>
                    updateScene({ rotation: Number(event.target.value) })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  <Type size={13} />
                  <span>OVERLAY TEXT</span>
                  <button
                    className="text-toggle"
                    onClick={() => setShowText((value) => !value)}
                  >
                    {showText ? "VISIBLE" : "HIDDEN"}
                  </button>
                </label>

                <textarea
                  className="text-input text-area"
                  value={current.text}
                  onChange={(event) =>
                    updateScene({ text: event.target.value })
                  }
                  placeholder="Enter cinematic text..."
                />

                <div className="text-options">
                  <div>
                    <label htmlFor="textColor">TEXT COLOR</label>
                    <input
                      id="textColor"
                      type="color"
                      value={current.textColor}
                      onChange={(event) =>
                        updateScene({ textColor: event.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="textSize">TEXT SIZE</label>
                    <input
                      id="textSize"
                      type="range"
                      min={14}
                      max={48}
                      value={current.textSize}
                      onChange={(event) =>
                        updateScene({
                          textSize: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="scene-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    const duplicate = {
                      ...current,
                      id: makeId(),
                      name: `${current.name} Copy`,
                    };

                    setScenes((old) => [...old, duplicate]);
                    setSelected(duplicate.id);
                    notify("Scene duplicated");
                  }}
                >
                  <Maximize2 size={15} />
                  DUPLICATE
                </button>

                <button className="export-button" onClick={exportCurrentFrame}>
                  <Download size={15} />
                  EXPORT PNG
                </button>
              </div>

              <button className="delete-button" onClick={deleteScene}>
                <Trash2 size={15} />
                DELETE SCENE
              </button>
            </section>
          )}

          <section className="engine-card">
            <div className="engine-top">
              <span className="status-dot" />
              <span>RENDER ENGINE</span>
              <span className="engine-ready">
                {scenes.length ? "READY" : "WAITING"}
              </span>
            </div>

            <div className="engine-description">
              CLIENT-SIDE PREVIEW ENGINE
            </div>

            <div className="engine-stats">
              <div>
                <span>SCENES</span>
                <strong>{scenes.length}</strong>
              </div>

              <div>
                <span>DURATION</span>
                <strong>{total.toFixed(1)}s</strong>
              </div>

              <div>
                <span>PLAYBACK</span>
                <strong>{playing ? "ACTIVE" : "IDLE"}</strong>
              </div>
            </div>
          </section>
        </section>
      </div>

      <footer className="statusbar">
        <span>
          <span className="status-dot" /> ENGINE ONLINE
        </span>

        <span>
          {ratio === "portrait"
            ? "1080 × 1920"
            : ratio === "square"
              ? "1080 × 1080"
              : "1920 × 1080"}
        </span>

        <span>BUILD 1.0.0</span>
      </footer>

      {notice && (
        <div className="toast">
          <Check size={15} />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Close notification">
            <X size={14} />
          </button>
        </div>
      )}
    </main>
  );
}

function SparkleIcon() {
  return <Clapperboard size={17} />;
                  }
