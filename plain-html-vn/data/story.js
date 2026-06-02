(function () {
  const script = document.currentScript;
  window.PLAIN_VN_ASSET_BASE = script ? new URL(".", script.src).href : new URL("./data/", document.baseURI).href;
  window.PLAIN_VN_STORY = String.raw`
# This is intentionally YAML-like, but parsed by the app directly.
# Use two spaces or one tab for nesting. Lines starting with # are comments.

backgrounds:
  index:
    color: #000000
  station:
    image: backgrounds/outside.webp
  classroom:
    image: backgrounds/classroom.webp
  rain:
    image: backgrounds/outside.webp
  night:
    image: backgrounds/rooftop.jpeg
  alarm:
    image: backgrounds/rooftop.jpeg

audio:
  silence:
    file: none
  morning:
    file: audio/file_example_MP3_700KB.mp3
  station:
    file: audio/file_example_MP3_700KB.mp3
  rain:
    file: audio/file_example_MP3_700KB.mp3
  evening:
    file: audio/file_example_MP3_700KB.mp3
  night:
    file: audio/file_example_MP3_700KB.mp3
  alarm:
    file: audio/file_example_MP3_700KB.mp3

story:
  scene-001:
    number: 01
    title: Morning Platform
    page: scenes/scene-001.html
    summary: A short opening scene with daylight, station ambience, and a quiet transition.
    1:
      background: station
      audio: station
      text: |
        The first train has not arrived yet. The platform lights buzz overhead while the sky slowly warms behind the tracks.
    2:
      background: classroom
      audio: morning
      text: |
        By the time the bell rings, the room has filled with the flat gold of early sunlight and the low sound of chairs being moved.
    3:
      background: rain
      audio: rain
      text: |
        Past the window, clouds gather over the rooftops. Conversation thins as everyone notices the color leaving the day.

  scene-002:
    number: 02
    title: After School Rain
    page: scenes/scene-002.html
    summary: Sections move between indoor shelter, rainfall, and a low evening mood.
    1:
      background: classroom
      audio: evening
      text: |
        The classroom empties in layers: first the noise, then the footsteps, then the last thin streaks of chalk dust in the air.
    2:
      background: rain
      audio: rain
      text: |
        At the school gate, rain breaks hard across the pavement. Umbrellas open one after another like dark flowers.
    3:
      background: night
      audio: night
      text: |
        The bus stop sign flickers on. Every passing car drags a silver reflection through the puddles and out of sight.

  scene-003:
    number: 03
    title: Night Walk
    page: scenes/scene-003.html
    summary: The final sample page shifts from streetlight calm to a sharper night tone.
    1:
      background: night
      audio: night
      text: |
        The streetlight hums above the empty road. For a few seconds, nothing moves except breath in the cold air.
    2:
      background: alarm
      audio: alarm
      text: |
        A red signal starts blinking at the crossing. The sound cuts through the night, too measured to ignore.
    3:
      background: station
      audio: station
      text: |
        When the last train pulls in, the platform is almost empty. The doors open with a soft mechanical sigh.
`;
})();
