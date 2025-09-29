const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running database migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Database migration completed successfully!');
    console.log('\n📊 Tables created:');
    console.log('  - matters');
    console.log('  - tasks');
    console.log('  - task_dependencies');
    console.log('\n🔒 Row Level Security enabled with open policies');
    console.log('📈 Indexes created for optimal performance');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

// Alternative approach if rpc doesn't work
async function runMigrationDirect() {
  try {
    console.log('🚀 Running database migration (direct approach)...');

    const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error(`❌ Failed at statement ${i + 1}:`, error);
        console.error('Statement:', statement);
        process.exit(1);
      }
    }

    console.log('✅ Database migration completed successfully!');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration().catch(() => {
    console.log('\n⚠️  RPC approach failed, trying direct approach...');
    runMigrationDirect();
  });
}