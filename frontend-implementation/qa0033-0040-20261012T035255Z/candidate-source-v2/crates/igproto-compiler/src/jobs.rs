//! Bound aggregate compiler jobs within one tool process.
use igproto_package::{Control, Result};
use std::sync::{Condvar, Mutex};
static RUNNING: Mutex<usize> = Mutex::new(0);
static WAKE: Condvar = Condvar::new();
pub(crate) struct Permit;
impl Permit {
    pub(crate) fn acquire(control: &Control) -> Result<Self> {
        let mut active = RUNNING.lock().unwrap_or_else(|p| p.into_inner());
        while *active >= 2 {
            control.check("compiler job queue")?;
            active = WAKE
                .wait_timeout(active, std::time::Duration::from_millis(25))
                .unwrap_or_else(|p| p.into_inner())
                .0;
        }
        control.check("compiler job queue")?;
        *active += 1;
        Ok(Self)
    }
}
impl Drop for Permit {
    fn drop(&mut self) {
        let mut active = RUNNING.lock().unwrap_or_else(|p| p.into_inner());
        *active -= 1;
        WAKE.notify_one();
    }
}
