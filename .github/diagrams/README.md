# Diagrams

Mermaid sources for the README and the docs, rendered in Hashi's colours (paper and ink, vermilion borders):

```bash
~/.claude/skills/project-docs/scripts/render_diagrams.sh .github/diagrams .github/assets '#FFFAF5' '#0F0E0E'
cp .github/assets/*-light.png .github/assets/*-dark.png docs-site/public/diagrams/
```

`fonts.css` feeds Figtree to the renderer (pass it with `--cssFile` when rendering by hand).
