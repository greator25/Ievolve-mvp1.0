import { db } from '../server/db.js';
import { users, hotels, participants, reassignments, auditLog } from '../shared/schema.js';

const cleanupOldData = async () => {
  console.log('🧹 Starting data cleanup...');
  
  try {
    // Delete in order to respect foreign key constraints
    console.log('Deleting reassignments...');
    await db.delete(reassignments);
    
    console.log('Deleting audit logs...');
    await db.delete(auditLog);
    
    console.log('Deleting participants...');
    await db.delete(participants);
    
    console.log('Deleting hotels...');
    await db.delete(hotels);
    
    console.log('Deleting users (except keeping admin structure)...');
    await db.delete(users);
    
    console.log('✅ All old data cleaned successfully');
    console.log('📊 Database is now ready for fresh data');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

// Run cleanup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupOldData()
    .then(() => {
      console.log('🎉 Cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to cleanup data:', error);
      process.exit(1);
    });
}

export { cleanupOldData };