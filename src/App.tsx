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
  RotateCw,
  Gauge,
  Repeat2,
  Camera,
  Clapperboard
} from 'lucide-react';

type Movement =
  | 'right'
  | 'left'
  | 'up'
  | 'down'
  | 'push'
  | 'pull'
  | 'orbit'
  | 'handheld';

type Scene = {
  id: string;
  name: string;
  image: string;
  duration: number;
  zoom: number;
  startZoom: number;
  rotation: number;
  speed: number;
  smoothness: number;
  movement: Movement;
  preset: string;
  text: string;
  loop: boolean;
};

const presets: {
  name: string;
  movement: Movement;
  zoom: number;
  startZoom: number;
  rotation: number;
  speed: number;
  smoothness: number;
}[] = [
  {
    name: 'Epic Reveal',
    movement: 'pull',
    startZoom: 1.45,
    zoom: 1.05,
    rotation: 0,
    speed: 0.7,
    smoothness: 90
  },
  {
    name: 'Dramatic Entrance',
    movement: 'push',
    startZoom: 1,
    zoom: 1.5,
    rotation: 2,
    speed: 0.8,
    smoothness: 85
  },
  {
    name: 'Dream Sequence',
    movement: 'up',
    startZoom: 1.12,
    zoom: 1.22,
    rotation: 0.5,
    speed: 0.45,
    smoothness: 100
  },
  {
    name: 'Action Shot',
    movement: 'handheld',
    startZoom: 1.2,
    zoom: 1.35,
    rotation: 1.5,
    speed: 1.8,
    smoothness: 35
  },
  {
    name: 'Divine Atmosphere',
    movement: 'orbit',
    startZoom: 1.12,
    zoom: 1.28,
    rotation: 1,
    speed: 0.5,
    smoothness: 100
  },
  {
    name: 'Documentary',
    movement: 'right',
    startZoom: 1.15,
    zoom: 1.3,
    rotation: 0,
    speed: 0.65,
    smoothness: 90
  }
];

const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function App() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selected, setSelected] = useState('');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [showText, setShowText] = useState(true);
  const [projectName, setProjectName] = useState('Untitled Film');

  const fileRef = useRef<HTMLInputElement>(null);
  

  const current =
    scenes.find(scene => scene.id === selected) || scenes[0];

  const total = scenes.reduce(
    (sum, scene) => sum + scene.duration,
    0
  );

  useEffect(() => {
    if (!playing || total <= 0) return;

    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;

      setTime(previous => {
        const next = previous + delta;

        if (next >= total) {
          return next % total;
        }

        return next;
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
      .map(file => ({
        id: uid(),
        name: file.name.replace(/\.[^.]+$/, ''),
        image: URL.createObjectURL(file),
        duration: 5,
        zoom: 1.3,
        startZoom: 1,
        rotation: 0,
        speed: 1,
        smoothness: 85,
        movement: 'right' as Movement,
        preset: 'Custom',
        text: '',
        loop: false
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

  const applyPreset = (preset: (typeof presets)[number]) => {
    updateScene({
      preset: preset.name,
      movement: preset.movement,
      startZoom: preset.startZoom,
      zoom: preset.zoom,
      rotation: preset.rotation,
      speed: preset.speed,
      smoothness: preset.smoothness
    });
  };

  let cursor = 0;
  let activeScene: Scene | undefined;
  let sceneStart = 0;

  for (const scene of scenes) {
    if (time < cursor + scene.duration) {
      activeScene = scene;
      sceneStart = cursor;
      break;
    }

    cursor += scene.duration;
  }

  if (!activeScene && scenes.length) {
    activeScene = scenes[scenes.length - 1];
    sceneStart = total - activeScene.duration;
  }

  const localTime = activeScene
    ? clamp(time - sceneStart, 0, activeScene.duration)
    : 0;

  const progress = activeScene
    ? clamp(localTime / activeScene.duration, 0, 1)
    : 0;

  const eased = activeScene
    ? progress < 0.5
      ? (1 -
          Math.pow(
            1 - progress * 2,
            activeScene.smoothness / 25 + 1
          )) / 2
      : 1 -
        (1 -
          Math.pow(
            1 - (progress - 0.5) * 2,
            activeScene.smoothness / 25 + 1
          )) / 2
    : 0;

  const cameraProgress =
    activeScene?.loop
      ? (1 - Math.cos(progress * Math.PI * 2)) / 2
      : eased;

  const cameraZoom = activeScene
    ? activeScene.startZoom +
      (activeScene.zoom - activeScene.startZoom) *
        cameraProgress
    : 1;

  const cameraRotation = activeScene
    ? activeScene.rotation *
      (activeScene.loop
        ? Math.sin(progress * Math.PI * 2)
        : progress)
    : 0;

  let offsetX = 0;
  let offsetY = 0;

  if (activeScene) {
    const amount = cameraProgress * 2 - 1;

    switch (activeScene.movement) {
      case 'right':
        offsetX = -amount * 2;
        break;
      case 'left':
        offsetX = amount * 2;
        break;
      case 'up':
        offsetY = amount * 2;
        break;
      case 'down':
        offsetY = -amount * 2;
        break;
      case 'orbit':
        offsetX = Math.sin(progress * Math.PI * 2) * 2;
        offsetY = Math.cos(progress * Math.PI * 2) * 2;
        break;
      case 'handheld':
        offsetX =
          Math.sin(time * 9 * activeScene.speed) * 0.8;
        offsetY =
          Math.cos(time * 12 * activeScene.speed) * 0.8;
        break;
      case 'push':
      case 'pull':
        break;
    }
  }

  const saveProject = () => {
    const project = {
      version: 2,
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

  const downloadCurrentImage = () => {
    if (!activeScene) return;

    const anchor = document.createElement('a');
    anchor.href = activeScene.image;
    anchor.download = `${activeScene.name || 'scene'}.png`;
    anchor.click();
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
            <small>ADVANCED CAMERA ENGINE</small>
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

          <button
            className="rail-item"
            onClick={downloadCurrentImage}
          >
            <Download />
            <span>Capture</span>
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
                    className="preview-image"
                    src={activeScene.image}
                    alt={activeScene.name}
                    style={{
                      transform: [
                        `translate(${offsetX}%, ${offsetY}%)`,
                        `scale(${cameraZoom})`,
                        `rotate(${cameraRotation}deg)`
                      ].join(' '),
                      transition: playing
                        ? 'none'
                        : 'transform 0.12s ease-out'
                    }}
                  />

                  <div className="preview-vignette" />

                  {showText && activeScene.text && (
                    <div className="preview-caption">
                      {activeScene.text}
                    </div>
                  )}

                  <div className="preview-label">
                    SCENE{' '}
                    {scenes.indexOf(activeScene) + 1}
                  </div>

                  <div className="camera-readout">
                    <Camera size={12} />
                    {cameraZoom.toFixed(2)}×
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
            <strong>CAMERA ENGINE</strong>
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
                <label>
                  <Clapperboard size={14} />
                  CINEMATIC PRESETS
                </label>

                <div className="preset-grid">
                  {presets.map(preset => (
                    <button
                      key={preset.name}
                      className={
                        current.preset === preset.name
                          ? 'preset-active'
                          : ''
                      }
                      onClick={() => applyPreset(preset)}
                    >
                      <Sparkles size={13} />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="property-group">
                <label>CAMERA MOVEMENT</label>

                <div className="motion-grid">
                  {(
                    [
                      'right',
                      'left',
                      'up',
                      'down',
                      'push',
                      'pull',
                      'orbit',
                      'handheld'
                    ] as Movement[]
                  ).map(movement => (
                    <button
                      key={movement}
                      className={
                        current.movement === movement
                          ? 'motion-active'
                          : ''
                      }
                      onClick={() =>
                        updateScene({
                          movement,
                          preset: 'Custom'
                        })
                      }
                    >
                      <MoveHorizontal size={14} />
                      {movement.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="property-group">
                <label>
                  <ZoomIn size={13} />
                  START ZOOM
                  <span>{current.startZoom.toFixed(2)}×</span>
                </label>

                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.01"
                  value={current.startZoom}
                  onChange={event =>
                    updateScene({
                      startZoom: Number(event.target.value),
                      preset: 'Custom'
                    })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  <ZoomIn size={13} />
                  END ZOOM
                  <span>{current.zoom.toFixed(2)}×</span>
                </label>

                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.01"
                  value={current.zoom}
                  onChange={event =>
                    updateScene({
                      zoom: Number(event.target.value),
                      preset: 'Custom'
                    })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  <Gauge size={13} />
                  MOVEMENT SPEED
                  <span>{current.speed.toFixed(1)}×</span>
                </label>

                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={current.speed}
                  onChange={event =>
                    updateScene({
                      speed: Number(event.target.value),
                      preset: 'Custom'
                    })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  <RotateCw size={13} />
                  CAMERA ROTATION
                  <span>{current.rotation}°</span>
                </label>

                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={current.rotation}
                  onChange={event =>
                    updateScene({
                      rotation: Number(event.target.value),
                      preset: 'Custom'
                    })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  MOTION SMOOTHNESS
                  <span>{current.smoothness}%</span>
                </label>

                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={current.smoothness}
                  onChange={event =>
                    updateScene({
                      smoothness: Number(event.target.value),
                      preset: 'Custom'
                    })
                  }
                />
              </div>

              <div className="property-group">
                <label>
                  SCENE DURATION
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

              <button
                className={`loop-control ${
                  current.loop ? 'loop-active' : ''
                }`}
                onClick={() =>
                  updateScene({ loop: !current.loop })
                }
              >
                <Repeat2 size={16} />
                LOOP CAMERA MOVEMENT
                <span>{current.loop ? 'ON' : 'OFF'}</span>
              </button>

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
                Import an image to unlock the camera engine.
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
              <i /> CAMERA ENGINE
            </span>

            <strong>READY</strong>
            <small>2D IMAGE ANIMATION</small>
          </div>
        </aside>
      </section>

      <footer className="footer">
        <span>
          <span className="live-dot" />
          ENGINE ONLINE
        </span>

        <span>1080 × 1920 TARGET</span>
        <span>BUILD 0.2.0</span>
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
