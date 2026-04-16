- Answer questions like
"how many attempts should it take for me now to have a >50% chance of getting >x score?"
"what is the probablility my next attempt gets >x score?"

- Tag filtering and search in activity list

- Ability to edit name, description and tags of a selected activity, as well as the typical attempt duration

- Ability to delete an activity

- Why have an ID for each progress log item? This makes it harder to perform manual data entry
Also: the createdAt field seems unnecceary bloat

UI clean up:
- unclear what 90% refers to -- mean?
- range should be under the x axis if that is what it controls
- typical attempt duration should be only visible for duration-type activities, but should be more prominent
- the bestOf entry field should be two immediately visible optional fields (duration and number of attempts) (one greys out the other) (if duration is entered and the activity has no configured typical attempt duration then this must also be entered in hidden field which appears)
- The log entries table can be removed.
- The "parsed as" message under duration should be a toast if anything. Right now it lingers only after that field has been blanked?
