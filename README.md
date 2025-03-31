# Tanmk Components Data

This repository contains tank component data in both Lua and JSON formats.

## Repository Structure

- `src/` - Contains the original Lua data files
  - `guns.lua` - Gun data
  - `turrets.lua` - Turret data
  - `hulls.lua` - Hull data
- `data/` - Contains the auto-generated JSON files
  - `guns.json` - Gun data in JSON format
  - `turrets.json` - Turret data in JSON format
  - `hulls.json` - Hull data in JSON format
- `scripts/` - Contains conversion utilities
  - `lua-to-json.js` - Script to convert Lua files to JSON

## Automated Conversion

This repository uses GitHub Actions to automatically convert Lua files to JSON whenever changes are pushed to the `src/` directory. The workflow is defined in `.github/workflows/convert-lua-to-json.yml`.

## How It Works

1. Push updates to the Lua files in the `src/` directory
2. GitHub Actions automatically runs the conversion script
3. The script generates updated JSON files in the `data/` directory
4. GitHub Actions commits and pushes the updated JSON files

## Manual Conversion

If you need to run the conversion manually:

1. Clone the repository
2. Install Node.js if you haven't already
3. Run the conversion script:

```bash
node scripts/lua-to-json.js src/guns.lua data/guns.json
node scripts/lua-to-json.js src/turrets.lua data/turrets.json
node scripts/lua-to-json.js src/hulls.lua data/hulls.json
```

## Using the Data

### Direct Access

You can directly access the JSON files via raw GitHub URLs:

```
https://raw.githubusercontent.com/your-username/tank-data/main/data/guns.json
https://raw.githubusercontent.com/your-username/tank-data/main/data/turrets.json
https://raw.githubusercontent.com/your-username/tank-data/main/data/hulls.json
```

### In Your Application

Example of how to fetch the data in JavaScript:

```javascript
async function fetchGunData() {
  const response = await fetch('https://raw.githubusercontent.com/your-username/tank-data/main/data/guns.json');
  const data = await response.json();
  return data;
}
```

## Contributing

1. Update the Lua files in the `src/` directory
2. Push your changes
3. The JSON files will be automatically updated

## License

[Your License Here]
