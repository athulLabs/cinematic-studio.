import { useEffect, useRef, useState } from 'react';
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
  RotateCcw,
} from 'lucide-react';

type Scene = {
  id: string;
  name: string;
  image: string;
  duration: number;
  zoom: number;
  movement: string;
  rotation: number;
  speed: number;
  smoothness: number;
  text: string;
};

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const createScene = (): Scene => ({
  id: uid(),
  name: 'Untitled Scene',
  image: '',
  duration: 5,
  zoom: 1,
  movement: 'right',
  rotation: 0,
  speed: 1,
  smoothness: 90,
  text: '',
});

export default function App() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selected, setSelected] = useState('');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [projectName, setProjectName] = useState('Untitled Film');
  const [activeTab, setActiveTab] = useState('scenes');
  const [showText, setShowText] = useState(false);
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const lastFrame = useRef(0);

  const current = scenes.find((scene) => scene.id === selected);

  const total = scenes.reduce(
    (sum, scene) => sum + scene.duration,
    0
  );

  const activeScene = (() => {
    if (!scenes.length) return null;

    let elapsed = 0;

    for (const scene of scenes) {
      if (time < elapsed + scene.duration) return scene;
      elapsed += scene.duration;
    }

    return scenes[scenes.length - 1];
  })();

  const activeIndex = activeScene
    ? scenes.findIndex((scene) => scene.id === activeScene.id)
    : -1;

  const localTime = (() => {
    let elapsed = 0;

    for (let i = 0; i < activeIndex; i++) {
      elapsed += scenes[i].duration;
    }

    return Math.max(0, time - elapsed);
  })();

  const progress = total > 0 ? (time / total) * 100 : 0;

  useEffect(() => {
    if (!playing || total <= 0) return;

    let frame = 0;
    lastFrame.current = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - lastFrame.current) / 1000, 0.1);
      lastFrame.current = now;

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
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(''), 2500);

    return () => window.clearTimeout(timer);
  }, [notice]);

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
    setTime(0);
    setPlaying(false);
    setActiveTab('scenes');
  };

  const deleteScene = () => {
    if (!current) return;

    setScenes((old) => {
      const remaining = old.filter((scene) => scene.id !== current.id);

      setSelected(remaining[0]?.id ?? '');
      return remaining;
    });

    setTime(0);
    setPlaying(false);
    setNotice('Scene deleted');
  };

  const importImages = (files: FileList | null) => {
    if (!files?.length) return;

    const images = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (!images.length) {
      setNotice('Please select image files');
      return;
    }

    const additions = images.map((file) => ({
      ...createScene(),
      name: file.name.replace(/\.[^.]+$/, ''),
      image: URL.createObjectURL(file),
    }));

    setScenes((old) => [...old, ...additions]);
    setSelected(additions[0].id);
    setTime(0);
    setPlaying(false);
    setNotice(`${additions.length} scene(s) imported`);
  };

  const exportProject = () => {
    const data = {
      application: 'Cinematic Studio',
      version: '1.0.0',
      projectName,
      aspectRatio: '9:16',
      scenes: scenes.map((scene) => ({
        ...scene,
        image: '',
      })),
      totalDuration: total,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${projectName.trim().replace(/[^a-z0-9_-]/gi, '_') || 'cinematic-project'}.json`;
    link.click();

    URL.revokeObjectURL(url);
    setNotice('Project settings exported');
  };

  const importProject = (file: File | undefined) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));

        if (!Array.isArray(data.scenes)) {
          throw new Error('Invalid project');
        }

        const restored: Scene[] = data.scenes.map((scene: Partial<Scene>) => ({
          ...createScene(),
          ...scene,
          id: uid(),
          image: '',
        }));

        setScenes(restored);
        setSelected(restored[0]?.id ?? '');
        setProjectName(data.projectName || 'Untitled Film');
        setTime(0);
        setPlaying(false);
        setNotice('Project settings imported. Reimport your images.');
      } catch {
        setNotice('Unable to import project file');
      }
    };

    reader.readAsText(file);
  };

  const downloadFrame = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;

    const ctx = canvas.getContext('2d');

    if (!ctx || !activeScene?.image) {
      setNotice('Import an image before exporting a frame');
      return;
    }

    const image = new Image();

    image.onload = () => {
      ctx.fillStyle = '#030611';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.max(
        canvas.width / image.width,
        canvas.height / image.height
      ) * activeScene.zoom;

      const width = image.width * scale;
      const height = image.height * scale;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((activeScene.rotation * Math.PI) / 180);

      ctx.drawImage(
        image,
        -width / 2,
        -height / 2,
        width,
        height
      );

      ctx.restore();

      if (activeScene.text) {
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '48px Georgia';
        ctx.shadowColor = 'rgba(0,0,0,.8)';
        ctx.shadowBlur = 12;

        ctx.fillText(
          activeScene.text,
          canvas.width / 2,
          canvas.height * 0.78,
          canvas.width * 0.85
        );

        ctx.restore();
      }

      const link = document.createElement('a');
      link.download = `cinematic-frame-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setNotice('Frame exported as PNG');
    };

    image.onerror = () => setNotice('Unable to load this image');
    image.src = activeScene.image;
  };

  const movementStyle = (scene: Scene, local: number) => {
    const duration = Math.max(scene.duration, 0.1);
    const raw = clamp(local / duration, 0, 1);
    const eased =
      scene.smoothness >= 50
        ? raw * raw * (3 - 2 * raw)
        : raw;

    const distance = 4 + scene.speed * 5;
    let x = 0;
    let y = 0;

    switch (scene.movement) {
      case 'left':
        x = distance * (1 - eased);
        break;
      case 'right':
        x = -distance * (1 - eased);
        break;
      case 'up':
        y = distance * (1 - eased);
        break;
      case 'down':
        y = -distance * (1 - eased);
        break;
      default:
        break;
    }

    return {
      transform: `translate(${x}%, ${y}%) scale(${scene.zoom}) rotate(${scene.rotation}deg)`,
    };
  };

  return (
    <main className="studio">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Aperture size={25} />
          </div>

          <div>
            <strong>CINEMATIC <span>STUDIO</span></strong>
            <small>CREATIVE MOTION ENGINE</small>
          </div>
        </div>

        <button
          className="icon-button"
          onClick={addScene}
          aria-label="Add scene"
        >
          <Plus />
        </button>
      </header>

      <section className="project-bar">
        <div>
          <small>PROJECT / {String(scenes.length).padStart(3, '0')}</small>

          <input
            className="project-name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            aria-label="Project name"
          />
        </div>

        <div className="project-actions">
          <button className="secondary-button" onClick={exportProject}>
            <Download size={15} /> SAVE PROJECT
          </button>

          <button
            className="secondary-button"
            onClick={() => projectRef.current?.click()}
          >
            OPEN
          </button>

          <input
            ref={projectRef}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              importProject(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </div>
      </section>

      <div className="workspace">
        <aside className="sidebar">
          <button
            className={activeTab === 'scenes' ? 'tool active' : 'tool'}
            onClick={() => setActiveTab('scenes')}
          >
            <Layers size={21} />
            <span>Scenes</span>
          </button>

          <button
            className={activeTab === 'text' ? 'tool active' : 'tool'}
            onClick={() => {
              setActiveTab('text');
              setShowText(true);
            }}
          >
            <Type size={21} />
            <span>Typography</span>
          </button>

          <button
            className={activeTab === 'import' ? 'tool active' : 'tool'}
            onClick={() => {
              setActiveTab('import');
              fileRef.current?.click();
            }}
          >
            <ImagePlus size={21} />
            <span>Import</span>
          </button>
        </aside>

        <div className="editor">
          <div className="composition-heading">
            <div>
              <span className="live-dot" /> LIVE COMPOSITION
            </div>

            <small>9:16 / VERTICAL</small>
          </div>

          <section className="preview-shell">
            <div className="preview">
              {activeScene?.image ? (
                <>
                  <img
                    className="preview-image"
                    src={activeScene.image}
                    alt={activeScene.name}
                    style={movementStyle(activeScene, localTime)}
                  />

                  <span className="scene-badge">
                    SCENE {activeIndex + 1}
                  </span>

                  {activeScene.text && (
                    <div className="preview-text">
                      {activeScene.text}
                    </div>
                  )}
                </>
              ) : (
                <button
                  className="empty-preview"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus size={38} />

                  <strong>CREATE YOUR FIRST SCENE</strong>

                  <span>Import an image to begin</span>
                </button>
              )}
            </div>
          </section>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              importImages(event.target.files);
              event.currentTarget.value = '';
            }}
          />

          <section className="playback">
            <button
              className="play-button"
              onClick={() => {
                if (!scenes.length || total <= 0) {
                  setNotice('Import an image to begin');
                  return;
                }

                if (time >= total) setTime(0);
                setPlaying((value) => !value);
              }}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </button>

            <span>{time.toFixed(1)}s</span>

            <input
              type="range"
              min="0"
              max={Math.max(total, 0.1)}
              step="0.1"
              value={Math.min(time, total)}
              onChange={(event) => setTime(Number(event.target.value))}
              aria-label="Playback timeline"
            />

            <small>{total.toFixed(1)}s</small>
          </section>

          <section className="timeline">
            <div className="section-heading">
              <div>
                <Film size={15} />
                TIMELINE
                <span className="count">{scenes.length} SCENES</span>
              </div>

              <button className="add-button" onClick={addScene}>
                <Plus size={15} /> ADD
              </button>
            </div>

            <div className="scene-strip">
              {scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  className={
                    selected === scene.id
                      ? 'scene-card selected'
                      : 'scene-card'
                  }
                  onClick={() => {
                    setSelected(scene.id);
                    setPlaying(false);

                    const start = scenes
                      .slice(0, index)
                      .reduce((sum, item) => sum + item.duration, 0);

                    setTime(start);
                  }}
                >
                  {scene.image ? (
                    <img src={scene.image} alt="" />
                  ) : (
                    <ImagePlus size={25} />
                  )}

                  <span className="scene-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="scene-duration">
                    {scene.duration}s
                  </span>
                </button>
              ))}

              <button
                className="scene-card import-card"
                onClick={() => fileRef.current?.click()}
              >
                <Plus size={22} />
                <span>IMPORT SCENE</span>
              </button>
            </div>
          </section>

          <section className="scene-controls">
            <div className="section-heading controls-heading">
              <Sparkles size={17} />
              SCENE CONTROLS
            </div>

            {!current ? (
              <div className="empty-controls">
                Import an image to unlock scene controls.

                <button
                  className="secondary-button"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus size={16} /> IMPORT IMAGE
                </button>
              </div>
            ) : (
              <>
                <label className="field-label">SCENE NAME</label>

                <input
                  className="control-input"
                  value={current.name}
                  onChange={(event) =>
                    updateScene({ name: event.target.value })
                  }
                />

                <div className="field-title">
                  <MoveHorizontal size={14} />
                  CAMERA MOTION
                </div>

                <div className="movement-grid">
                  {['right', 'left', 'up', 'down'].map((direction) => (
                    <button
                      key={direction}
                      className={
                        current.movement === direction
                          ? 'movement-button active'
                          : 'movement-button'
                      }
                      onClick={() => updateScene({ movement: direction })}
                    >
                      ↔ {direction.toUpperCase()}
                    </button>
                  ))}
                </div>

                <label className="field-label slider-label">
                  <ZoomIn size={14} />
                  CAMERA ZOOM
                  <span>{current.zoom.toFixed(2)}×</span>
                </label>

                <input
                  className="range-input"
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={current.zoom}
                  onChange={(event) =>
                    updateScene({ zoom: Number(event.target.value) })
                  }
                />

                <label className="field-label slider-label">
                  ROTATION
                  <span>{current.rotation}°</span>
                </label>

                <input
                  className="range-input"
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={current.rotation}
                  onChange={(event) =>
                    updateScene({ rotation: Number(event.target.value) })
                  }
                />

                <label className="field-label slider-label">
                  MOVEMENT SPEED
                  <span>{current.speed.toFixed(1)}×</span>
                </label>

                <input
                  className="range-input"
                  type="range"
                  min="0.2"
                  max="2"
                  step="0.1"
                  value={current.speed}
                  onChange={(event) =>
                    updateScene({ speed: Number(event.target.value) })
                  }
                />

                <label className="field-label slider-label">
                  SMOOTHNESS
                  <span>{current.smoothness}%</span>
                </label>

                <input
                  className="range-input"
                  type="range"
                  min="0"
                  max="100"
                  value={current.smoothness}
                  onChange={(event) =>
                    updateScene({
                      smoothness: Number(event.target.value),
                    })
                  }
                />

                <label className="field-label slider-label">
                  DURATION
                  <span>{current.duration}s</span>
                </label>

                <input
                  className="range-input"
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={current.duration}
                  onChange={(event) =>
                    updateScene({
                      duration: Number(event.target.value),
                    })
                  }
                />

                <div className="field-title">
                  <Type size={14} />
                  OVERLAY TEXT
                </div>

                <textarea
                  className="text-input"
                  value={current.text}
                  placeholder="Enter your cinematic text..."
                  onChange={(event) =>
                    updateScene({ text: event.target.value })
                  }
                />

                <div className="action-grid">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      updateScene({
                        zoom: 1,
                        rotation: 0,
                        movement: 'right',
                        speed: 1,
                        smoothness: 90,
                      });
                      setNotice('Camera settings reset');
                    }}
                  >
                    <RotateCcw size={15} /> RESET CAMERA
                  </button>

                  <button
                    className="secondary-button"
                    onClick={downloadFrame}
                  >
                    <Download size={15} /> EXPORT FRAME
                  </button>
                </div>

                <button
                  className="delete-button"
                  onClick={deleteScene}
                >
                  <Trash2 size={15} /> DELETE SCENE
                </button>
              </>
            )}

            <div className="engine-card">
              <span className="live-dot" /> RENDER ENGINE

              <strong>READY</strong>

              <small>CLIENT-SIDE PREVIEW</small>
            </div>
          </section>
        </div>
      </div>

      <footer className="statusbar">
        <span><i /> ENGINE ONLINE</span>
        <span>1080 × 1920 TARGET</span>
        <span>BUILD 0.2.0</span>
      </footer>

      {notice && <div className="toast">{notice}</div>}

      {showText && activeTab === 'text' && (
        <button
          className="text-mode-close"
          onClick={() => setShowText(false)}
        >
          CLOSE TYPOGRAPHY
        </button>
      )}
    </main>
  );
                  }
