---
description: Deploy an over-the-air update to the app
---

To update the installed application without a full rebuild, run the following command:

```bash
eas update --branch main --message "Description of changes"
```

**Note:**
- Replace `"Description of changes"` with a short summary of what you fixed or added.
- The app needs to be restarted (sometimes twice) on the device to pick up the changes.
