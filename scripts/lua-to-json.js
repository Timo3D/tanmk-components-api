const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * A brute force parser specifically designed for Lua format with guns, turrets and hulls
 * @param {string} luaContent - Content of the Lua file
 * @returns {Object} Parsed data with guns, turrets and hulls identified
 */
function parseLuaFile(luaContent) {
  console.log("Starting robust parsing of Lua data...");
  
  // Remove return and trailing semicolon if present
  luaContent = luaContent.replace(/^return\s*{/, '{');
  luaContent = luaContent.replace(/};$/, '}');
  
  // Split the content by components (each component is a line starting with ['ComponentName'])
  const result = {
    guns: {},    // Added guns section
    turrets: {},
    hulls: {}
  };
  
  let currentPosition = 0;
  
  // Process each component
  while (true) {
    // Find the next component
    const componentMatch = luaContent.substring(currentPosition).match(/\['([^']+)'\]\s*=\s*{id\s*=\s*(\d+)/);
    if (!componentMatch) break;
    
    const componentName = componentMatch[1];
    const componentId = componentMatch[2];
    console.log(`Found component: ${componentName}`);
    
    // Move past the component name and ID
    currentPosition += componentMatch.index + componentMatch[0].length;
    
    // Find where this component ends (next component starts or end of file)
    let nextComponentIndex = luaContent.indexOf("[", currentPosition);
    if (nextComponentIndex === -1) nextComponentIndex = luaContent.length;
    
    // Extract the component's content
    const componentContent = luaContent.substring(currentPosition, nextComponentIndex);
    currentPosition = nextComponentIndex;
    
    // Create component entry
    const componentData = {
      id: componentId,
      metadata: {
        attributes: {},
        config: {}
      }
    };
    
    // Extract attributes section
    const attributesMatch = componentContent.match(/attributes\s*=\s*{([^}]+)}/);
    if (attributesMatch) {
      const attributesContent = attributesMatch[1];
      
      // Process CFrame
      const cfMatch = attributesContent.match(/CF\s*=\s*CFrame\.new\(([^)]+)\)/);
      if (cfMatch) {
        const cfValues = cfMatch[1].split(',').map(v => parseFloat(v.trim()));
        componentData.metadata.attributes.CF = {
          position: [cfValues[0], cfValues[1], cfValues[2]],
          orientation: [
            cfValues[3] || 1, cfValues[4] || 0, cfValues[5] || 0,
            cfValues[6] || 0, cfValues[7] || 1, cfValues[8] || 0,
            cfValues[9] || 0, cfValues[10] || 0, cfValues[11] || 1
          ]
        };
      }
      
      // Process string attributes
      const stringMatches = attributesContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
      for (const match of stringMatches) {
        componentData.metadata.attributes[match[1]] = match[2];
      }
      
      // Process numeric attributes
      const numericMatches = attributesContent.matchAll(/(\w+)\s*=\s*(\d+)/g);
      for (const match of numericMatches) {
        if (!componentData.metadata.attributes[match[1]]) {
          componentData.metadata.attributes[match[1]] = parseInt(match[2]);
        }
      }
      
      // Process Vector2 and Vector3
      const vectorMatches = attributesContent.matchAll(/(\w+)\s*=\s*Vector(\d)\.new\(([^)]+)\)/g);
      for (const match of vectorMatches) {
        const values = match[3].split(',').map(v => parseFloat(v.trim()));
        componentData.metadata.attributes[match[1]] = {
          type: `Vector${match[2]}`,
          values: values
        };
      }
    }
    
    // Extract tdAttributes section if present
    const tdAttributesMatch = componentContent.match(/tdAttributes\s*=\s*{([^}]+)}/);
    if (tdAttributesMatch) {
      componentData.metadata.tdAttributes = {};
      const tdAttributesContent = tdAttributesMatch[1];
      
      // Process string attributes
      const stringMatches = tdAttributesContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
      for (const match of stringMatches) {
        componentData.metadata.tdAttributes[match[1]] = match[2];
      }
      
      // Process numeric attributes
      const numericMatches = tdAttributesContent.matchAll(/(\w+)\s*=\s*(\d+)/g);
      for (const match of numericMatches) {
        componentData.metadata.tdAttributes[match[1]] = parseInt(match[2]);
      }
      
      // Process Vector2 and Vector3
      const vectorMatches = tdAttributesContent.matchAll(/(\w+)\s*=\s*Vector(\d)\.new\(([^)]+)\)/g);
      for (const match of vectorMatches) {
        const values = match[3].split(',').map(v => parseFloat(v.trim()));
        componentData.metadata.tdAttributes[match[1]] = {
          type: `Vector${match[2]}`,
          values: values
        };
      }
      
      // Process boolean attributes
      const booleanMatches = tdAttributesContent.matchAll(/(\w+)\s*=\s*(true|false)/g);
      for (const match of booleanMatches) {
        componentData.metadata.tdAttributes[match[1]] = match[2] === 'true';
      }
    }
    
    // Extract ammoMass if present
    const ammoMassMatch = componentContent.match(/ammoMass\s*=\s*([\d\.]+)/);
    if (ammoMassMatch) {
      componentData.metadata.ammoMass = parseFloat(ammoMassMatch[1]);
    }
    
    // Extract crew if present
    const crewMatch = componentContent.match(/crew\s*=\s*{([^}]+)}/);
    if (crewMatch) {
      const crewContent = crewMatch[1];
      componentData.metadata.crew = [];
      
      const crewMembers = crewContent.match(/"([^"]+)"/g);
      if (crewMembers) {
        for (const crewMember of crewMembers) {
          componentData.metadata.crew.push(crewMember.replace(/"/g, ''));
        }
      }
    }
    
    // Extract config section
    const configStart = componentContent.indexOf("config = {");
    if (configStart !== -1) {
      // Find where the config section starts and ends
      const configContentStart = configStart + "config = {".length;
      
      // Count braces to find the matching closing brace
      let braceCount = 1;
      let configEnd = configContentStart;
      
      for (let i = configContentStart; i < componentContent.length; i++) {
        if (componentContent[i] === '{') braceCount++;
        if (componentContent[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          configEnd = i;
          break;
        }
      }
      
      const configContent = componentContent.substring(configContentStart, configEnd);
      
      // Process each config property
      // Vector3 properties
      const vectorMatches = configContent.matchAll(/(\w+)\s*=\s*Vector3\.new\(([^)]+)\)/g);
      for (const match of vectorMatches) {
        const values = match[2].split(',').map(v => parseFloat(v.trim()));
        componentData.metadata.config[match[1]] = {
          type: 'Vector3',
          values: values
        };
      }
      
      // String properties in quotes
      const stringMatches = configContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
      for (const match of stringMatches) {
        componentData.metadata.config[match[1]] = match[2];
      }
      
      // Boolean properties
      const booleanMatches = configContent.matchAll(/(\w+)\s*=\s*(true|false)/g);
      for (const match of booleanMatches) {
        componentData.metadata.config[match[1]] = match[2] === 'true';
      }
      
      // Color3 properties
      const colorMatches = configContent.matchAll(/(\w+)\s*=\s*Color3\.new\(([^)]+)\)/g);
      for (const match of colorMatches) {
        const values = match[2].split(',').map(v => parseFloat(v.trim()));
        componentData.metadata.config[match[1]] = {
          type: 'Color3',
          values: values
        };
      }
      
      // Numeric properties
      const numericMatches = configContent.matchAll(/(\w+)\s*=\s*([\d\.]+)/g);
      for (const match of numericMatches) {
        // Only set if not already set by a more specific pattern
        if (!componentData.metadata.config[match[1]]) {
          componentData.metadata.config[match[1]] = parseFloat(match[2]);
        }
      }
      
      // Extract Shells section if present (for guns)
      const shellsStart = configContent.indexOf("Shells = {");
      if (shellsStart !== -1) {
        // Initialize Shells object
        componentData.metadata.config.Shells = {};
        
        // Find the end of the Shells section
        const shellsContentStart = shellsStart + "Shells = {".length;
        let shellsBraceCount = 1;
        let shellsEnd = shellsContentStart;
        
        for (let i = shellsContentStart; i < configContent.length; i++) {
          if (configContent[i] === '{') shellsBraceCount++;
          if (configContent[i] === '}') shellsBraceCount--;
          
          if (shellsBraceCount === 0) {
            shellsEnd = i;
            break;
          }
        }
        
        const shellsContent = configContent.substring(shellsContentStart, shellsEnd);
        
        // Process each shell type
        let currentShellIndex = 0;
        
        while (true) {
          // Find the next shell type
          const shellTypeMatch = shellsContent.substring(currentShellIndex).match(/(\w+)\s*=\s*{/);
          if (!shellTypeMatch) break;
          
          const shellType = shellTypeMatch[1];
          console.log(`  Found shell type: ${shellType}`);
          
          // Move past the shell type name
          currentShellIndex += shellTypeMatch.index + shellTypeMatch[0].length;
          
          // Find where this shell type ends
          let shellBraceCount = 1;
          let shellEnd = currentShellIndex;
          
          for (let i = currentShellIndex; i < shellsContent.length; i++) {
            if (shellsContent[i] === '{') shellBraceCount++;
            if (shellsContent[i] === '}') shellBraceCount--;
            
            if (shellBraceCount === 0) {
              shellEnd = i;
              break;
            }
          }
          
          const shellPropsContent = shellsContent.substring(currentShellIndex, shellEnd);
          currentShellIndex = shellEnd + 1;
          
          // Create shell type entry
          componentData.metadata.config.Shells[shellType] = {};
          
          // Process shell properties
          // Numeric properties
          const shellNumMatches = shellPropsContent.matchAll(/(\w+)\s*=\s*([\d\.]+)/g);
          for (const match of shellNumMatches) {
            componentData.metadata.config.Shells[shellType][match[1]] = parseFloat(match[2]);
          }
          
          // String properties
          const shellStrMatches = shellPropsContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
          for (const match of shellStrMatches) {
            componentData.metadata.config.Shells[shellType][match[1]] = match[2];
          }
          
          // Boolean properties
          const shellBoolMatches = shellPropsContent.matchAll(/(\w+)\s*=\s*(true|false)/g);
          for (const match of shellBoolMatches) {
            componentData.metadata.config.Shells[shellType][match[1]] = match[2] === 'true';
          }
        }
      }
    }
    
    // Determine component type (gun, turret, or hull)
    const componentType = identifyComponentType(componentData);
    
    // Place the component in the appropriate section
    result[componentType][componentName] = componentData;
  }
  
  return result;
}

/**
 * Identify the type of component (gun, turret, or hull)
 * @param {Object} component - The component data
 * @returns {string} The component type: 'guns', 'turrets', or 'hulls'
 */
function identifyComponentType(component) {
  if (!component.metadata || !component.metadata.config) {
    return 'turrets'; // Default fallback
  }
  
  const config = component.metadata.config;
  
  // Check for gun-specific properties
  const hasGunProperties = config.hasOwnProperty('GunCaliber') || 
                          config.hasOwnProperty('RecoilForce') ||
                          config.hasOwnProperty('RecoilLength') ||
                          config.hasOwnProperty('OverheatMult') ||
                          config.hasOwnProperty('GunWeight') ||
                          (config.Shells && Object.keys(config.Shells).length > 0);
  
  // Check for turret-specific properties
  const hasTurretProperties = config.hasOwnProperty('VtPos') || 
                             config.hasOwnProperty('HzTraverse') || 
                             config.hasOwnProperty('VtTraverse') ||
                             config.hasOwnProperty('Stabiliser') ||
                             config.hasOwnProperty('TurretWeight');
  
  // Check for hull-specific properties
  const hasHullProperties = config.hasOwnProperty('ReverseGears') || 
                           config.hasOwnProperty('TrackThickness') || 
                           config.hasOwnProperty('SpringStiffness') ||
                           config.hasOwnProperty('MaxSteerAngle') ||
                           config.hasOwnProperty('HullWeight');
  
  // Prioritize identification (guns take precedence if both gun and turret properties exist)
  if (hasGunProperties && !hasHullProperties) {
    return 'guns';
  } else if (hasTurretProperties && !hasHullProperties && !hasGunProperties) {
    return 'turrets';
  } else if (hasHullProperties) {
    return 'hulls';
  } else {
    // Default to turrets for ambiguous cases
    console.log(`Warning: Component type ambiguous, defaulting to turret`);
    return 'turrets';
  }
}

/**
 * Main function to convert multiple Lua files to a single JSON with guns, turrets and hulls
 */
function convertMultipleLuaToJson() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node lua-to-json.js <input_pattern> <output_json_file>');
    console.error('Example: node lua-to-json.js "src/*.lua" data/combined.json');
    process.exit(1);
  }
  
  const inputPattern = args[0];
  const outputFile = args[1];
  
  console.log(`Looking for Lua files matching pattern: ${inputPattern}`);
  
  try {
    // Find all matching Lua files
    const files = glob.sync(inputPattern);
    
    if (files.length === 0) {
      console.error(`No files found matching pattern: ${inputPattern}`);
      process.exit(1);
    }
    
    console.log(`Found ${files.length} Lua files to process:`);
    files.forEach(file => console.log(`- ${file}`));
    
    // Initialize the combined data
    const combinedData = {
      guns: {},     // Added guns section
      turrets: {},
      hulls: {},
      count: {
        guns: 0,    // Added guns count
        turrets: 0,
        hulls: 0,
        total: 0
      }
    };
    
    // Process each file
    for (const file of files) {
      console.log(`\nProcessing file: ${file}`);
      
      if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
        continue;
      }
      
      // Read and parse the file
      const luaContent = fs.readFileSync(file, 'utf8');
      const parsedData = parseLuaFile(luaContent);
      
      // Count components
      const gunsCount = Object.keys(parsedData.guns).length;
      const turretCount = Object.keys(parsedData.turrets).length;
      const hullCount = Object.keys(parsedData.hulls).length;
      
      console.log(`Found ${gunsCount} guns, ${turretCount} turrets and ${hullCount} hulls in ${file}`);
      
      // Merge with combined data
      Object.assign(combinedData.guns, parsedData.guns);
      Object.assign(combinedData.turrets, parsedData.turrets);
      Object.assign(combinedData.hulls, parsedData.hulls);
      
      // Update counts
      combinedData.count.guns += gunsCount;
      combinedData.count.turrets += turretCount;
      combinedData.count.hulls += hullCount;
      combinedData.count.total += gunsCount + turretCount + hullCount;
    }
    
    // Add metadata
    combinedData.sourceFiles = files;
    combinedData.lastUpdated = new Date().toISOString();
    
    // Create directories if they don't exist
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the output file
    fs.writeFileSync(outputFile, JSON.stringify(combinedData, null, 2), 'utf8');
    
    // Also write a debug version with extra spacing for readability
    const debugOutputFile = outputFile.replace('.json', '-debug.json');
    fs.writeFileSync(debugOutputFile, JSON.stringify(combinedData, null, 4), 'utf8');
    
    console.log(`\nSuccessfully processed ${files.length} files`);
    console.log(`Combined data written to ${outputFile}`);
    console.log(`Debug version saved as ${debugOutputFile}`);
    console.log(`Total components: ${combinedData.count.total}`);
    console.log(`- Guns: ${combinedData.count.guns}`);
    console.log(`- Turrets: ${combinedData.count.turrets}`);
    console.log(`- Hulls: ${combinedData.count.hulls}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the conversion
convertMultipleLuaToJson();