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
  Film
} from 'lucide-react';

type Scene = {
  id: string;
  name: string;
  image: string;
  duration: number;
  zoom: number;
  movement: string;
  text: string;
};

export default function App() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selected, setSelected] = useState('');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [showText, setShowText] = useState(true);
  const [projectName, setProjectName] = useState('Untitled Film');

  const fileRef = useRef<HTMLInputElement>(null);

  const current = scenes.find(s => s.id === selected) || scenes[0];

  const total = scenes.reduce(
    (sum, scene) => sum + scene.duration,
    0
  );

  useEffect(() => {
    if (!playing || total <= 0) return;

    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      setTime(previous => {
        const next = previous + delta;
        return next >= total ? next % total : next;
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [playing, total]);

  const importImages = (files: FileList | null) => {
    if (!files) return;

    const additions: Scene[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map((file, index) => ({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ''),
        image: URL.createObjectURL(file),
        duration: 5,
        zoom: 1.18,
        movement: index % 2 === 0 ? 'right' : 'left',
        text: ''
      }));

    if (!additions.length) return;

    setScenes(previous => [...previous, ...additions]);
    setSelected(additions[0].id);
    setPlaying(false);
  };

  const updateScene = (patch: Partial<Scene>) => {
    if (!current) return;

    setScenes(previous =>
      previous.map(scene =>
        scene.id === current.id
          ? { ...scene, ...patch }
          : scene
      )
    );
  };

  let cursor = 0;

  const activeScene = scenes.find(scene => {
    const found = time < cursor + scene.duration;
    cursor += scene.duration;
    return found;
  }) || scenes[scenes.length - 1];

  const sceneStart = activeScene
    ? scenes
        .slice(0, scenes.indexOf(activeScene))
        .reduce((sum, scene) => sum + scene.duration, 0)
    : 0;

  const localTime = activeScene ? time - sceneStart : 0;

  const progress = activeScene
    ? Math.min(localTime / activeScene.duration, 1)
    : 0;

  const saveProject = () => {
    const project = {
      projectName,
      scenes: scenes.map(({ image, ...scene }) => scene)
    };

    const blob = new Blob(
      [JSON.stringify(project, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'cinematic-project.json';
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const newProject = () => {
    if (
      !window.confirm(
        'Start a new project? Unsaved changes may be lost.'
      )
    ) {
      return;
    }

    scenes.forEach(scene => URL.revokeObjectURL(scene.image));

    setScenes([]);
    setSelected('');
    setTime(0);
    setPlaying(false);
    setProjectName('Untitled Film');
  };

  return (
    <main className="studio">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Aperture size={22} />
          </div>

          <div>
            <strong>
              CINEMATIC<span> STUDIO</span>
            </strong>
            <small>CREATIVE MOTION ENGINE</small>
          </div>
        </div>

        <div className="top-actions">
          <span className="status">
            <i /> LOCAL PROJECT
          </span>

          <button
            className="icon-btn"
            onClick={newProject}
            title="New project"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      <section className="projectbar">
        <div>
          <span className="eyebrow">PROJECT / 001</span>

          <input
            className="project-name"
            value={projectName}
            onChange={event =>
              setProjectName(event.target.value)
            }
            aria-label="Project name"
          />
        </div>

        <button className="export-btn" onClick={saveProject}>
          <Download size={16} />
          SAVE PROJECT
        </button>
      </section>

      <section className="workspace">
        <aside className="toolrail">
          <button className="rail-item active">
            <Layers />
            <span>Scenes</span>
          </button>

          <button
            className="rail-item"
            onClick={() => setShowText(value => !value)}
          >
            <Type />
            <span>Typography</span>
          </button>

          <button
            className="rail-item"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus />
            <span>Import</span>
          </button>
        </aside>

        <section className="editor">
          <div className="editor-heading">
            <div>
              <span className="live-dot" />
              LIVE COMPOSITION
            </div>

            <span className="resolution">
              9:16 / VERTICAL
            </span>
          </div>

          <div className="preview-stage">
            <div className="preview">
              {activeScene ? (
                <>
                  <img
                    key={activeScene.id}
                    className={`preview-image move-${activeScene.movement}`}
                    src={activeScene.image}
                    alt={activeScene.name}
                    style={{
                      transform: `scale(${
                        1 + (activeScene.zoom - 1) * progress
                      })`
                    }}
                  />

                  <div className="preview-vignette" />

                  {showText && activeScene.text && (
                    <div className="preview-caption">
                      {activeScene.text}
                    </div>
                  )}

                  <div className="preview-label">
                    SCENE {scenes.indexOf(activeScene) + 1}
                  </div>
                </>
              ) : (
                <button
                  className="empty-preview"
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="upload-orb">
                    <ImagePlus size={30} />
                  </div>

                  <strong>CREATE YOUR FIRST SCENE</strong>
                  <span>Import an image to begin</span>
                </button>
              )}
            </div>
          </div>

          <div className="transport">
            <button
              className="play-btn"
              onClick={() => {
                if (total > 0) {
                  if (!playing && time >= total) setTime(0);
                  setPlaying(value => !value);
                }
              }}
            >
              {playing ? (
                <Pause size={18} />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>

            <span className="timecode">
              {time.toFixed(1)}s
            </span>

            <input
              className="transport-slider"
              type="range"
              min="0"
              max={Math.max(total, 0.1)}
              step="0.1"
              value={Math.min(time, total)}
              onChange={event => {
                setTime(Number(event.target.value));
                setPlaying(false);
              }}
              aria-label="Timeline position"
            />

            <span className="timecode">
              {total.toFixed(1)}s
            </span>
          </div>

          <div className="timeline-panel">
            <div className="section-title">
              <div>
                <Film size={16} />
                TIMELINE
                <span>{scenes.length} SCENES</span>
              </div>

              <button
                className="small-add"
                onClick={() => fileRef.current?.click()}
              >
                <Plus size={15} /> ADD
              </button>
            </div>

            <div className="timeline">
              {scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  className={`scene-card ${
                    selected === scene.id ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelected(scene.id);

                    setTime(
                      scenes
                        .slice(0, index)
                        .reduce(
                          (sum, item) => sum + item.duration,
                          0
                        )
                    );

                    setPlaying(false);
                  }}
                >
                  <img src={scene.image} alt="" />

                  <div className="scene-number">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <span className="scene-duration">
                    {scene.duration}s
                  </span>
                </button>
              ))}

              <button
                className="add-scene"
                onClick={() => fileRef.current?.click()}
              >
                <Plus size={21} />
                <span>IMPORT SCENE</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="inspector">
          <div className="inspector-heading">
            <Sparkles size={17} />
            <strong>SCENE CONTROLS</strong>
          </div>

          {current ? (
            <>
              <div className="property-group">
                <label>SCENE NAME</label>

                <input
                  value={current.name}
                  onChange={event =>
                    updateScene({ name: event.target.value })
                  }
                />
              </div>

              <div className="property-group">
                <label>CAMERA MOTION</label>

                <div className="motion-grid">
                  {['right', 'left', 'up', 'down'].map(
                    movement => (
                      <button
                        key={movement}
                        className={
                          current.movement === movement
                            ? 'motion-active'
                            : ''
                        }
                        onClick={() =>
                          updateScene({ movement })
                        }
                      >
                        <MoveHorizontal size={15} />
                        {movement.toUpperCase()}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="property-group">
                <label>
                  <ZoomIn size={13} />
                  CAMERA ZOOM
                  <span>{current.zoom.toFixed(2)}×</span>
                </label>

                <input
                  type="range"
                  min="1"
                  max="1.6"
                  step="0.01"
                  value={current.zoom}
                  onChange={event =>
                    updateScene({
                      zoom: Number(event.target.value)
                    })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  DURATION
                  <span>{current.duration}s</span>
                </label>

                <input
                  type="range"
                  min="1"
                  max="20"
                  value={current.duration}
                  onChange={event =>
                    updateScene({
                      duration: Number(event.target.value)
                    })
                  }
                />
              </div>

              {showText && (
                <div className="property-group">
                  <label>
                    <Type size={13} />
                    OVERLAY TEXT
                  </label>

                  <textarea
                    placeholder="Enter your cinematic quote..."
                    value={current.text}
                    onChange={event =>
                      updateScene({ text: event.target.value })
                    }
                  />
                </div>
              )}

              <button
                className="delete-btn"
                onClick={() => {
                  URL.revokeObjectURL(current.image);

                  setScenes(previous =>
                    previous.filter(
                      scene => scene.id !== current.id
                    )
                  );

                  setSelected('');
                  setPlaying(false);
                }}
              >
                <Trash2 size={15} />
                DELETE SCENE
              </button>
            </>
          ) : (
            <div className="inspector-empty">
              <ImagePlus size={27} />

              <p>
                Import an image to unlock scene controls.
              </p>

              <button
                onClick={() => fileRef.current?.click()}
              >
                IMPORT IMAGE
              </button>
            </div>
          )}

          <div className="engine-status">
            <span>
              <i /> RENDER ENGINE
            </span>

            <strong>READY</strong>
            <small>CLIENT-SIDE PREVIEW</small>
          </div>
        </aside>
      </section>

      <footer className="footer">
        <span>
          <span className="live-dot" />
          ENGINE ONLINE
        </span>

        <span>1080 × 1920 TARGET</span>
        <span>BUILD 0.1.0</span>
      </footer>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={event => {
          importImages(event.target.files);
          event.target.value = '';
        }}
      />
    </main>
  );
                }
