# Tank Components Database

A comprehensive database and web interface for browsing tank components including guns, turrets, and hulls.

## 🌐 Live Website

**[View the Interactive Database](https://timo3d.github.io/tanmk-components-api/)**

Browse all components with an easy-to-use interface featuring searchable lists, detailed specifications, and organized information.

## 📊 Data Access

All component data is available in a single JSON file:

- **[components.json](./data/components.json)** - Combined data for all guns, turrets, and hulls

## ⚙️ Features

- **Comprehensive Data**: Detailed specifications for hundreds of tank components
- **Component Types**:
  - **Guns**: Weapon systems with caliber, shell types, and ballistic data
  - **Turrets**: Turret mechanisms with traverse specifications and crew information
  - **Hulls**: Tank chassis with mobility characteristics and armor details
- **Searchable Interface**: Find components quickly with the search feature
- **Organized Information**: Data is clearly categorized and presented in an intuitive layout

## 🔧 Structure

```
.
├── data/                # Component data in JSON format
├── scripts/             # Processing scripts
├── index.html           # Web interface
└── README.md            # This file
```

## 🚀 Using the Data

The components.json file contains three main sections:

```javascript
{
  "guns": { /* gun components */ },
  "turrets": { /* turret components */ },
  "hulls": { /* hull components */ },
  "count": { /* component counts */ },
  "lastUpdated": "2025-03-31T12:34:56.789Z"
}
```

Each component contains detailed metadata including attributes, configuration parameters, and technical specifications.

## 📋 License

This project is intended for informational and educational purposes.

---

Made by qolop ft. Claude AI