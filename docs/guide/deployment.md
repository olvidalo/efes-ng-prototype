# Publishing Your Site

The pipeline produces a complete static website in the `_output/` directory. Deploying it is as simple as copying that folder to a web server.

## Basic Deployment

Copy the contents of `_output/` to any web server:

```bash
# Example: rsync to a server
rsync -av _output/ user@server:/var/www/my-edition/
```

## GitHub Pages

You can deploy automatically using GitHub Actions. Add a workflow file to your repository:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm install -g @efes-ng/core
      - run: efes-ng run

      - uses: actions/upload-pages-artifact@v3
        with:
          path: _output

      - uses: actions/deploy-pages@v4
```

Enable GitHub Pages in your repository settings (Settings → Pages → Source: GitHub Actions).

## Netlify

Connect your Git repository in the Netlify dashboard and set:

- **Build command:** `npx efes-ng run`
- **Publish directory:** `_output`

## Any Static Host

The output is plain HTML — it works on any hosting platform that serves static files. No server-side runtime is needed.
