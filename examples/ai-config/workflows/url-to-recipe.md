---
title: URL to Recipe
description: Convert a recipe URL into a formatted recipe file in the recipes folder
model: claude-haiku-4-5
effort: low
fields:
  - name: url
    label: Recipe URL
    type: url
    required: true
    placeholder: "https://example.com/recipe/..."
  - name: instructions
    label: Additional Instructions
    type: textarea
    required: false
    placeholder: "Any modifications or notes..."
---

Fetch the recipe at the following URL and convert it to a recipe markdown file in the recipes folder, following the recipe template.

URL: {{url}}

Additional instructions from the user:
{{instructions}}
