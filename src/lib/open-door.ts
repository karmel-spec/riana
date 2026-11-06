/**
 * TEMPORARY: while the password / magic-link sign-in is being sorted out,
 * this opens the site with no login at all. It forces "demo" mode: the
 * sample (fake) data with the "View as" switcher in the sidebar, exactly
 * like the local preview. Nothing from the real database is shown or
 * touched while this is on.
 *
 * Set this back to false (or delete the file and its two uses) to restore
 * the sign-in screen.
 */
export const OPEN_DOOR = true;
