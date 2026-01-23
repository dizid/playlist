// Run database migrations on Neon
// Usage: node scripts/run-migration.js [migration-file]
// Examples:
//   node scripts/run-migration.js                          # Run all migrations
//   node scripts/run-migration.js 002_enable_rls.sql       # Run specific migration

import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.VITE_NEON_DATABASE_URL ||
  'postgresql://neondb_owner:npg_T1CbKlmBio3w@ep-jolly-term-a1ii1cjm-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function runMigration() {
  const specificFile = process.argv[2];
  const migrationsDir = join(__dirname, '..', 'db', 'migrations');

  console.log('Connecting to Neon database...');
  const sql = neon(DATABASE_URL);

  try {
    // Get migration files to run
    let files;
    if (specificFile) {
      files = [specificFile];
    } else {
      files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    }

    console.log(`Running ${files.length} migration(s)...\n`);

    for (const file of files) {
      const filePath = join(migrationsDir, file);
      console.log(`📄 ${file}`);

      const content = readFileSync(filePath, 'utf-8');

      // Split by semicolons but handle functions/triggers that contain semicolons
      const statements = splitSqlStatements(content);

      for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;

        try {
          // Use raw query for DDL statements
          await sql.unsafe(trimmed);
          // Show first 50 chars of the statement
          const preview = trimmed.replace(/\s+/g, ' ').substring(0, 60);
          console.log(`  ✓ ${preview}...`);
        } catch (err) {
          // Some errors are ok (like "already exists")
          if (err.message.includes('already exists') ||
              err.message.includes('does not exist')) {
            console.log(`  ⚠ ${err.message.split('\n')[0]}`);
          } else {
            throw err;
          }
        }
      }
      console.log('');
    }

    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    process.exit(1);
  }
}

// Split SQL into statements, handling functions with $$ delimiters
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    // Skip comment-only lines
    if (line.trim().startsWith('--')) continue;

    // Check for $$ delimiter (function bodies)
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      for (const _ of dollarMatches) {
        inDollarQuote = !inDollarQuote;
      }
    }

    current += line + '\n';

    // If we're not inside a function and line ends with semicolon, it's a complete statement
    if (!inDollarQuote && line.trim().endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  // Add any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

runMigration().catch(console.error);
