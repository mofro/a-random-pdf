#!/usr/bin/env node

/**
 * PDF Update Scheduler
 * 
 * This script manages cron jobs for automatically updating the PDF data.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./search-config');

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  install: args.includes('--install') || args.includes('-i'),
  uninstall: args.includes('--uninstall') || args.includes('-u'),
  status: args.includes('--status') || args.includes('-s'),
  schedule: args.find(arg => arg.startsWith('--schedule='))?.split('=')[1] || config.cronSchedule,
  showHelp: args.includes('--help') || args.includes('-h')
};

// Show help and exit if requested
if (options.showHelp) {
  console.log(`
PDF Update Scheduler

Usage:
  node schedule-updates.js [options]

Options:
  --install, -i            Install the cron job
  --uninstall, -u          Uninstall the cron job
  --status, -s             Show current cron job status
  --schedule=CRON_EXPR     Set custom cron schedule (default: ${config.cronSchedule})
  --help, -h               Show this help message

Examples:
  node schedule-updates.js --install
  node schedule-updates.js --schedule="0 0 * * 0" --install  # Run at midnight on Sundays
  node schedule-updates.js --uninstall
  node schedule-updates.js --status
  `);
  process.exit(0);
}

// Main function
async function main() {
  console.log('PDF Update Scheduler');
  console.log('===================');
  
  try {
    // Check if cron is available
    try {
      execSync('which crontab', { stdio: 'pipe' });
    } catch (error) {
      console.error('Cron is not available on this system.');
      process.exit(1);
    }
    
    // Get the absolute path to the update script
    const scriptDir = path.resolve(__dirname);
    const updateScript = path.join(scriptDir, 'update-pdfs.js');
    
    // Ensure the update script exists and is executable
    if (!fs.existsSync(updateScript)) {
      console.error(`Update script not found: ${updateScript}`);
      process.exit(1);
    }
    
    // Make the script executable
    try {
      fs.chmodSync(updateScript, '755');
    } catch (error) {
      console.warn(`Warning: Could not make the update script executable: ${error.message}`);
    }
    
    // Get the project root directory
    const projectRoot = path.resolve(scriptDir, '../..');
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Define the cron job
    const cronJob = `${options.schedule} cd ${projectRoot} && node ${updateScript} --all >> ${path.join(logsDir, 'updates.log')} 2>&1`;
    
    // Get current cron jobs
    const currentCronJobs = getCurrentCronJobs();
    
    // Check if our job is already installed
    const jobInstalled = isJobInstalled(currentCronJobs, updateScript);
    
    if (options.status) {
      console.log(`Cron job status: ${jobInstalled ? 'Installed' : 'Not installed'}`);
      
      if (jobInstalled) {
        console.log('Current schedule:');
        currentCronJobs.forEach(job => {
          if (job.includes(updateScript)) {
            console.log(`  ${job}`);
          }
        });
      }
    }
    else if (options.install) {
      if (jobInstalled) {
        console.log('Cron job is already installed. Uninstalling and reinstalling with new schedule...');
        uninstallCronJob(currentCronJobs, updateScript);
      }
      
      installCronJob(cronJob);
      console.log(`Cron job installed with schedule: ${options.schedule}`);
      console.log(`It will run: ${updateScript} --all`);
      console.log(`Logs will be saved to: ${path.join(logsDir, 'updates.log')}`);
    }
    else if (options.uninstall) {
      if (jobInstalled) {
        uninstallCronJob(currentCronJobs, updateScript);
        console.log('Cron job uninstalled successfully.');
      } else {
        console.log('No cron job found to uninstall.');
      }
    }
    else {
      console.log('No action specified. Use --install, --uninstall, or --status.');
      console.log('For help, use --help.');
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Get current cron jobs
function getCurrentCronJobs() {
  try {
    const output = execSync('crontab -l', { stdio: 'pipe', encoding: 'utf8' });
    return output.split('\n').filter(line => line.trim().length > 0);
  } catch (error) {
    // If there are no cron jobs, crontab -l will exit with error
    if (error.status === 1 && error.stderr.includes('no crontab')) {
      return [];
    }
    throw error;
  }
}

// Check if our job is already installed
function isJobInstalled(jobs, scriptPath) {
  return jobs.some(job => job.includes(scriptPath));
}

// Install the cron job
function installCronJob(cronJob) {
  // Get current cron jobs
  let jobs;
  try {
    jobs = getCurrentCronJobs();
  } catch (error) {
    jobs = [];
  }
  
  // Add our job
  jobs.push(cronJob);
  
  // Write the updated cron jobs
  const tempFile = path.join(require('os').tmpdir(), `crontab-${Date.now()}.txt`);
  fs.writeFileSync(tempFile, jobs.join('\n') + '\n');
  
  execSync(`crontab ${tempFile}`, { stdio: 'pipe' });
  fs.unlinkSync(tempFile);
}

// Uninstall the cron job
function uninstallCronJob(jobs, scriptPath) {
  // Filter out our job
  const updatedJobs = jobs.filter(job => !job.includes(scriptPath));
  
  // Write the updated cron jobs
  const tempFile = path.join(require('os').tmpdir(), `crontab-${Date.now()}.txt`);
  fs.writeFileSync(tempFile, updatedJobs.join('\n') + (updatedJobs.length > 0 ? '\n' : ''));
  
  execSync(`crontab ${tempFile}`, { stdio: 'pipe' });
  fs.unlinkSync(tempFile);
}

// Run the main function
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 