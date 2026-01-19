/**
 * MFDach POS/LST Import Script
 * Importiert das Leistungsverzeichnis aus MFDach nach Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

const supabaseUrl = 'https://jprzdmmvyxqejifazkbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcnpkbW12eXhxZWppZmF6a2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjUwOTIsImV4cCI6MjA4NDQwMTA5Mn0.VrwKmQ7SLqyh_c2VJB3dehjcyDVEJ3FECEPhLlxVgiw';

const supabase = createClient(supabaseUrl, supabaseKey);

const POSTEN_DIR = path.join(process.cwd(), 'Posten');

// Einheiten-Mapping (häufige MFDach Einheiten)
const UNIT_MAP = {
  'psch': 'pauschal',
  'm': 'Meter',
  'm²': 'Quadratmeter',
  'm³': 'Kubikmeter',
  'lfm': 'laufender Meter',
  'Std': 'Stunde',
  'Stk': 'Stück',
  'kg': 'Kilogramm',
  't': 'Tonne'
};

/**
 * Liest eine Datei mit DOS CP437 Encoding (typisch für ältere deutsche DOS/Windows-Programme)
 */
function readFileWithEncoding(filePath) {
  const buffer = fs.readFileSync(filePath);
  // CP437 ist das DOS-Encoding für deutsche Umlaute (0x9a = Ü, 0x84 = ä, etc.)
  return iconv.decode(buffer, 'cp437');
}

/**
 * Parst eine LST-Datei (Kategorie-Hierarchie)
 */
function parseLstFile(content, sourceFile) {
  const categories = [];
  const lines = content.split('\n');

  let currentIndex = null;
  let currentCategory = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Format: 000G = guid, 000N = name, 000P = parent index
    const match = trimmed.match(/^(\d{3})([GNEP])\s*=\s*(.*)$/);
    if (match) {
      const [, index, type, value] = match;

      if (index !== currentIndex) {
        if (currentIndex !== null && currentCategory.name) {
          categories.push({ ...currentCategory });
        }
        currentIndex = index;
        currentCategory = { sortOrder: parseInt(index, 10), sourceFile };
      }

      switch (type) {
        case 'G':
          currentCategory.sourceGuid = value.trim();
          break;
        case 'N':
          currentCategory.name = value.trim();
          break;
        case 'P':
          // Parent ist ein Index, wir müssen später die GUID auflösen
          currentCategory.parentIndex = parseInt(value.trim(), 10);
          break;
      }
    }
  }

  // Letzten Eintrag hinzufügen
  if (currentCategory.name) {
    categories.push(currentCategory);
  }

  // Parent-Index zu Parent-GUID auflösen
  const guidByIndex = {};
  categories.forEach(cat => {
    if (cat.sortOrder !== undefined && cat.sourceGuid) {
      guidByIndex[cat.sortOrder] = cat.sourceGuid;
    }
  });

  categories.forEach(cat => {
    if (cat.parentIndex !== undefined && guidByIndex[cat.parentIndex]) {
      cat.parentGuid = guidByIndex[cat.parentIndex];
    }
    delete cat.parentIndex;
  });

  return categories;
}

/**
 * Parst eine POS-Datei (Leistungspositionen)
 */
function parsePosFile(content, sourceFile) {
  const positions = [];
  const lines = content.split('\n');

  let currentPosition = null;
  let currentField = null;
  let multilineBuffer = [];
  let lineIndex = 0;

  // Attribute am Anfang der Datei sammeln (@A Einträge)
  const attributes = {};

  for (const line of lines) {
    lineIndex++;
    const trimmed = line.trimEnd();

    // @A Attribute (Auswahloptionen wie Materialstärken, Farben etc.)
    if (trimmed.startsWith('@A')) {
      const attrName = trimmed.substring(2).trim();
      // Nächste Zeile ist der Wert
      continue;
    }

    // Neue Position beginnt
    if (trimmed.startsWith('@P')) {
      // Vorherige Position speichern
      if (currentPosition && currentPosition.name) {
        if (currentField === 'T' || currentField === 'B') {
          currentPosition[currentField === 'T' ? 'longText' : 'description'] = multilineBuffer.join('\n').trim();
        }
        positions.push({ ...currentPosition });
      }

      currentPosition = {
        name: trimmed.substring(2).trim(),
        sourceFile,
        rawLines: []
      };
      currentField = 'values';
      multilineBuffer = [];
      continue;
    }

    if (!currentPosition) continue;

    // Felder erkennen
    if (trimmed.startsWith('@T')) {
      // Vorheriges Multiline-Feld speichern
      if (currentField === 'B') {
        currentPosition.description = multilineBuffer.join('\n').trim();
      }
      currentField = 'T';
      multilineBuffer = [];
      continue;
    }

    if (trimmed.startsWith('@R')) {
      // Vorheriges Multiline-Feld speichern
      if (currentField === 'T') {
        currentPosition.longText = multilineBuffer.join('\n').trim();
      }
      currentField = 'R';
      multilineBuffer = [];
      continue;
    }

    if (trimmed.startsWith('@M')) {
      // Vorheriges Multiline-Feld speichern
      if (currentField === 'T') {
        currentPosition.longText = multilineBuffer.join('\n').trim();
      } else if (currentField === 'R') {
        currentPosition.shortText = multilineBuffer.join('\n').trim();
      }
      currentPosition.unit = trimmed.substring(2).trim();
      currentField = null;
      multilineBuffer = [];
      continue;
    }

    if (trimmed.startsWith('@E')) {
      if (currentField === 'T') {
        currentPosition.longText = multilineBuffer.join('\n').trim();
      }
      currentPosition.unitCode = trimmed.substring(2).trim();
      currentField = null;
      multilineBuffer = [];
      continue;
    }

    if (trimmed.startsWith('@C')) {
      currentPosition.categoryGuid = trimmed.substring(2).trim();
      currentField = null;
      continue;
    }

    if (trimmed.startsWith('@D')) {
      currentPosition.sourceId = trimmed.substring(2).trim();
      currentField = null;
      continue;
    }

    if (trimmed.startsWith('@B')) {
      if (currentField === 'T') {
        currentPosition.longText = multilineBuffer.join('\n').trim();
      }
      currentField = 'B';
      multilineBuffer = [];
      continue;
    }

    if (trimmed.startsWith('@K') || trimmed.startsWith('@L') || trimmed.startsWith('@W') ||
        trimmed.startsWith('@H') || trimmed.startsWith('@Y') || trimmed.startsWith('@V')) {
      // Header/Meta-Felder ignorieren
      currentField = null;
      continue;
    }

    // Werte sammeln
    if (currentField === 'T' || currentField === 'R' || currentField === 'B') {
      multilineBuffer.push(line);
    } else if (currentField === 'values' && currentPosition) {
      // Erste Werte nach @P sind Preise/Faktoren
      const numMatch = trimmed.match(/^[\d,\.]+$/);
      if (numMatch) {
        if (!currentPosition.priceValue1) {
          currentPosition.priceValue1 = parseFloat(trimmed.replace(',', '.'));
        } else if (!currentPosition.priceValue2) {
          currentPosition.priceValue2 = parseFloat(trimmed.replace(',', '.'));
        }
      }
    }
  }

  // Letzte Position speichern
  if (currentPosition && currentPosition.name) {
    if (currentField === 'T') {
      currentPosition.longText = multilineBuffer.join('\n').trim();
    } else if (currentField === 'R') {
      currentPosition.shortText = multilineBuffer.join('\n').trim();
    }
    positions.push(currentPosition);
  }

  return positions;
}

/**
 * Importiert Kategorien aus allen LST-Dateien
 */
async function importCategories() {
  console.log('\n📁 Importiere Kategorien aus LST-Dateien...');

  const files = fs.readdirSync(POSTEN_DIR).filter(f => f.toLowerCase().endsWith('.lst') && !f.includes('.bak'));
  console.log(`   Gefunden: ${files.length} LST-Dateien`);

  let totalCategories = 0;

  for (const file of files) {
    const filePath = path.join(POSTEN_DIR, file);
    const content = readFileWithEncoding(filePath);
    const categories = parseLstFile(content, file);

    if (categories.length === 0) continue;

    // In Supabase einfügen
    const records = categories.map(cat => ({
      source_guid: cat.sourceGuid,
      name: cat.name,
      parent_guid: cat.parentGuid || null,
      source_file: cat.sourceFile,
      sort_order: cat.sortOrder
    }));

    const { error } = await supabase
      .from('mfdach_categories')
      .upsert(records, { onConflict: 'source_guid', ignoreDuplicates: true });

    if (error) {
      console.error(`   ❌ Fehler bei ${file}:`, error.message);
    } else {
      console.log(`   ✓ ${file}: ${categories.length} Kategorien`);
      totalCategories += categories.length;
    }
  }

  console.log(`   ══════════════════════════════`);
  console.log(`   📊 Gesamt: ${totalCategories} Kategorien importiert`);

  return totalCategories;
}

/**
 * Importiert Positionen aus allen POS-Dateien
 */
async function importPositions() {
  console.log('\n📋 Importiere Positionen aus POS-Dateien...');

  const files = fs.readdirSync(POSTEN_DIR).filter(f =>
    f.toLowerCase().endsWith('.pos') && !f.includes('.bak')
  );
  console.log(`   Gefunden: ${files.length} POS-Dateien`);

  let totalPositions = 0;

  for (const file of files) {
    const filePath = path.join(POSTEN_DIR, file);
    const content = readFileWithEncoding(filePath);
    const positions = parsePosFile(content, file);

    if (positions.length === 0) {
      console.log(`   ⚠ ${file}: Keine Positionen gefunden`);
      continue;
    }

    // In Batches von 100 einfügen
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);

      const records = batch.map(pos => ({
        source_id: pos.sourceId || null,
        name: pos.name,
        short_text: pos.shortText || null,
        long_text: pos.longText || null,
        unit: pos.unit || null,
        unit_code: pos.unitCode || null,
        category_guid: pos.categoryGuid || null,
        price_value1: pos.priceValue1 || null,
        price_value2: pos.priceValue2 || null,
        source_file: pos.sourceFile,
        raw_data: {
          description: pos.description
        }
      }));

      const { error, data } = await supabase
        .from('mfdach_positions')
        .insert(records)
        .select('id');

      if (error) {
        console.error(`   ❌ Fehler bei ${file} (Batch ${Math.floor(i/batchSize)+1}):`, error.message);
      } else {
        inserted += data?.length || batch.length;
      }
    }

    console.log(`   ✓ ${file}: ${inserted} Positionen`);
    totalPositions += inserted;
  }

  console.log(`   ══════════════════════════════`);
  console.log(`   📊 Gesamt: ${totalPositions} Positionen importiert`);

  return totalPositions;
}

/**
 * Zeigt Statistiken nach dem Import
 */
async function showStats() {
  console.log('\n📈 Import-Statistiken:');

  const { count: catCount } = await supabase
    .from('mfdach_categories')
    .select('*', { count: 'exact', head: true });

  const { count: posCount } = await supabase
    .from('mfdach_positions')
    .select('*', { count: 'exact', head: true });

  const { data: byFile } = await supabase
    .from('mfdach_positions')
    .select('source_file')
    .then(res => {
      const counts = {};
      res.data?.forEach(r => {
        counts[r.source_file] = (counts[r.source_file] || 0) + 1;
      });
      return { data: counts };
    });

  console.log(`   Kategorien: ${catCount}`);
  console.log(`   Positionen: ${posCount}`);
  console.log('\n   Nach Datei:');

  if (byFile) {
    Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .forEach(([file, count]) => {
        console.log(`     ${file}: ${count}`);
      });
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  MFDach Leistungsverzeichnis Import');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Quellverzeichnis: ${POSTEN_DIR}`);

  // Prüfen ob Verzeichnis existiert
  if (!fs.existsSync(POSTEN_DIR)) {
    console.error('❌ Posten-Verzeichnis nicht gefunden!');
    process.exit(1);
  }

  // Optional: Alte Daten löschen
  const args = process.argv.slice(2);
  if (args.includes('--clean')) {
    console.log('\n🗑️  Lösche alte Daten...');
    await supabase.from('mfdach_positions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('mfdach_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('   Alte Daten gelöscht.');
  }

  // Import durchführen
  await importCategories();
  await importPositions();
  await showStats();

  console.log('\n✅ Import abgeschlossen!');
}

main().catch(console.error);
