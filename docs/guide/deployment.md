# Publishing Your Site

The pipeline produces a complete static website in the `_output/` directory. Deploying it is as simple as copying that folder to a web server.

## GitHub Pages

The scaffold includes a ready-to-use GitHub Actions workflow at `.github/workflows/deploy.yml`. It runs automatically on every push to `main`:

1. Checks out your repository (including XSLT stylesheet submodules)
2. Installs EFES-NG
3. Runs the pipeline (`efes-ng run`)
4. Deploys `_output/` to GitHub Pages

The site URL will be `https://your-username.github.io/your-repo-name/`. The `PATH_PREFIX` environment variable is set automatically so all links work correctly in the subdirectory.

### Setup

1. Go to your repository on GitHub
2. Click **Settings** > **Pages**
3. Under **Source**, select **GitHub Actions**

If you already pushed before enabling Pages, go to **Actions** > **Deploy to GitHub Pages** > **Run workflow** to trigger the first build manually.

![](images/deployment-github-setup-pages.png)

### Watching the Build

After pushing, go to the **Actions** tab to see build progress. Click on a workflow run to see detailed logs.

### Manual Builds

You can trigger a build without pushing: **Actions** > **Deploy to GitHub Pages** > **Run workflow**.

### Clean Builds

If your build fails repeatedly or your site shows stale content (for example after renaming or deleting template files), a cached build artifact might be the cause. Try a clean build first:

1. Go to **Actions** > **Deploy to GitHub Pages** > **Run workflow**
2. Check **Clean build (ignore caches)**
3. Click **Run workflow**

This skips all build caches and reprocesses everything from scratch.

### Build Caching

The first build will take a while (several minutes for large collections) because it processes every file from scratch. GitHub's CI servers are also slower than your local machine, so expect it to take longer than local builds.

After the first build, the workflow caches the full build state:

- **EFES-NG installation**: Cached until the framework is updated.
- **Pipeline build state**: Compiled stylesheets, transformed files, and the assembled site. On the next build, only files you actually changed are reprocessed.

Subsequent builds after small content changes should complete much faster.

### Custom Domain

To use your own domain (e.g., `seals.example.org`) instead of `your-username.github.io`:

1. In your repository **Settings** > **Pages**, enter your custom domain
2. Add a `CNAME` file to your project's `source/website/` directory containing just the domain name:

   ```
   seals.example.org
   ```

3. Remove or clear the `PATH_PREFIX` in the workflow file (your site is now at the root, not a subdirectory):

   ```yaml
   - name: Build site
     run: efes-ng run
   ```

4. Configure DNS with your domain provider (GitHub's documentation covers this in detail)

<!--
## Netlify

Connect your Git repository in the Netlify dashboard and set:

- **Build command:** `efes-ng run`
- **Publish directory:** `_output`

For subdirectory deployment, add `PATH_PREFIX=/my-path/` as an environment variable in the Netlify build settings.
-->

## Manual Deployment

Copy the contents of `_output/` to any web server:

```bash
# Example: rsync to a server
rsync -av _output/ user@server:/var/www/my-edition/
```

### Subdirectory Deployment

If deploying to a subdirectory (e.g., `example.com/my-edition/`), set the `PATH_PREFIX` environment variable before building, or use the Export feature of the Desktop Application to make sure all links on the generated site work:

#### Using the Desktop Application

The desktop app's **Export** button builds the pipeline and saves the output to a folder of your choice, with optional path prefix for subdirectory deployment. See [Desktop Application](/guide/gui#exporting).

####  Using the CLI

```bash
PATH_PREFIX=/my-edition/ efes-ng run
```

This ensures all internal links use the correct prefix.