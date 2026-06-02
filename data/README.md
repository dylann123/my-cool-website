# Story Data

Edit `story.js`. It is written scene-first, with numbered story beats under each scene:

```text
audio:
  silence:
    label: Silence
    file: none
  test:
    label: Test MP3
    file: audio/file_example_MP3_700KB.mp3

story:
  scene-004:
    number: 04
    title: New Scene
    page: scenes/scene-004.html
    summary: One sentence for the index.
    1:
      background: station
      audio: test
      text: |
        Story text goes here.
```

Rules:

- Use two spaces or one tab for nesting.
- Lines starting with `#` are comments.
- Numbered keys under a scene, such as `1:` and `2:`, become story sections.
- `text: |` lets you write normal indented story text.
- `background` and `audio` refer to ids in the `backgrounds:` and `audio:` sections.
- Backgrounds support only `image: backgrounds/file.webp` or `color: #123456`.
- The page is black by default; images are centered and scaled to screen height without stretching.
- Audio supports only `file: audio/file.mp3`; use `file: none` for silence.
- Scene pages are still separate HTML wrappers. To add a scene, copy an existing file in `../scenes/` and change `data-scene-id`.
