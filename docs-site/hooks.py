"""
MkDocs hooks for the Hierarchy Hub docs site (ADR 0015).

The markdown in docs/ is written to read well on GitHub, so some links point outside docs/,
to code, the root README or CONTRIBUTING.md. Those files aren't part of the site, so links to
them are rewritten to the same file on GitHub. Pictures outside docs/ load from GitHub too.

The site's logo is the web app's own favicon, added at build time so there's only one copy.
"""

import os
import posixpath
import re

from mkdocs.structure.files import File

REPO = "https://github.com/Ayush-B99/hierarchyHub"
BRANCH = "main"
LOGO_SOURCE = "apps/web/public/favicon.svg"

# markdown links and images: ](target) and html src="target" or href="target"
LINK = re.compile(r'(\]\()([^)\s]+)(\))|((?:src|href)=")([^"]+)(")')


def _outside_target(page_src: str, target: str):
    """the repo path a relative link points to, if it leaves docs/, else None"""
    if re.match(r"^[a-z]+:|^#|^/", target):
        return None
    path, _, anchor = target.partition("#")
    resolved = posixpath.normpath(posixpath.join("docs", posixpath.dirname(page_src), path))
    if resolved.startswith("docs/"):
        return None
    return resolved, anchor


def on_page_markdown(markdown, page, config, files):
    root = os.path.dirname(config["config_file_path"])

    def rewrite(match):
        before, target, after = (
            (match.group(1), match.group(2), match.group(3))
            if match.group(1)
            else (match.group(4), match.group(5), match.group(6))
        )
        outside = _outside_target(page.file.src_uri, target)
        if outside is None:
            return match.group(0)
        path, anchor = outside
        is_picture = before.startswith("src=")
        if is_picture:
            url = f"https://raw.githubusercontent.com/Ayush-B99/hierarchyHub/{BRANCH}/{path}"
        else:
            kind = "tree" if os.path.isdir(os.path.join(root, path)) else "blob"
            url = f"{REPO}/{kind}/{BRANCH}/{path}" + (f"#{anchor}" if anchor else "")
        return f"{before}{url}{after}"

    return LINK.sub(rewrite, markdown)


def on_files(files, config):
    root = os.path.dirname(config["config_file_path"])
    files.append(
        File.generated(
            config, "assets/logo.svg", abs_src_path=os.path.join(root, LOGO_SOURCE)
        )
    )
    return files
