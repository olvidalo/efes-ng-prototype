# Deploying to GitHub Pages

Your edition is ready. Let's publish it so anyone can access it online.

GitHub Pages is a free hosting service built into GitHub. Every push to your repository automatically rebuilds and deploys the site. The scaffold includes a workflow file that handles this for you.

## Prerequisites

- Your project is in a GitHub repository
- You have pushed your content to the `main` branch

## Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu bar)
3. Click **Pages** (left sidebar)
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

That's it. The next push to `main` will trigger the deployment.

## How It Works

The scaffold includes a workflow file at `.github/workflows/deploy.yml` that runs automatically on every push to `main`. It:

1. Checks out your repository (including XSLT stylesheet submodules)
2. Installs EFES-NG
3. Runs the pipeline (`efes-ng run`)
4. Deploys the `_output/` directory to GitHub Pages

The site URL will be `https://your-username.github.io/your-repo-name/`. The `PATH_PREFIX` environment variable is set automatically so all links work correctly in the subdirectory.

## Watching the Build

After pushing, go to the **Actions** tab in your repository to see the build progress. Click on a workflow run to see detailed logs. If something fails, the error messages will tell you what went wrong.

## Triggering a Manual Build

You can also trigger a build without pushing:

1. Go to **Actions**
2. Click **Deploy to GitHub Pages** in the left sidebar
3. Click **Run workflow**
4. Click the green **Run workflow** button

## Clean Builds

If your build fails repeatedly or your site shows stale content (for example after renaming or deleting template files), a cached build artifact might be the cause. Try a clean build first before investigating further:

1. Go to **Actions**
2. Click **Deploy to GitHub Pages**
3. Click **Run workflow**
4. Check **Clean build (ignore caches)**
5. Click **Run workflow**

This skips all build caches and reprocesses everything from scratch. If the clean build succeeds, the problem was a stale cache.

## Custom Domain

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

## Build Caching

The first build will take a while (several minutes for large collections) because it processes every file from scratch. GitHub's CI servers are also slower than your local machine, so expect it to take longer than local builds.

After the first build, the workflow caches the full build state:

- **EFES-NG installation**: The framework itself. Cached until you change the version.
- **Pipeline build state**: Compiled stylesheets, transformed files, and the assembled site. On the next build, only files you actually changed are reprocessed.

This means subsequent builds after small content changes (editing a few XML files, updating a template) should complete much faster.
