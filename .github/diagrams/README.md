# Diagrams

Mermaid sources for the README and the docs, rendered in Hashi's colours (paper and ink, vermilion borders):

```bash
for name in into-bch out-of-bch on-bch; do
  npx -y @mermaid-js/mermaid-cli -i .github/diagrams/$name.mmd -o .github/assets/$name-light.png -c .github/diagrams/mermaid-light.json --cssFile .github/diagrams/fonts.css -b '#FFFAF5' -s 2
  npx -y @mermaid-js/mermaid-cli -i .github/diagrams/$name.mmd -o .github/assets/$name-dark.png -c .github/diagrams/mermaid-dark.json --cssFile .github/diagrams/fonts.css -b '#0F0E0E' -s 2
done
cp .github/assets/*-light.png .github/assets/*-dark.png docs-site/public/diagrams/
```

`fonts.css` feeds Figtree to the renderer (pass it with `--cssFile` when rendering by hand).
