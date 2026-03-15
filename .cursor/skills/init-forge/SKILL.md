---
name: init-forge
description: [git_flow|forge-bootstrap] Scaffold .forge structure from skill-local knowledge map
---

# Init Forge

Use the provided script to create the `.forge` folder and file structure defined in `references/knowledge_map.json`.

## What It Does

- Reads `references/knowledge_map.json` from this skill.
- Collects all `primary_doc` and child file paths in the map.
- Creates directories and files in the target project.
- Creates blank templates by file type:
  - `.json` -> `{}` + trailing newline
  - `.md` -> blank file
- Canonical assets (always overwritten from references):
  - `.forge/skill_registry.json` from `references/skill_registry.json`
  - `.forge/knowledge_map.json` from `references/knowledge_map.json`
- Other files: created only if missing (never overwritten).

## Usage

Run the script:

`node scripts/init-forge.js [target-project-path]`

- `target-project-path` is optional.
- If omitted, the script uses the current working directory.
