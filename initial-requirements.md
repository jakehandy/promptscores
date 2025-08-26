Create me a simple React-based web app. This site will be hosted on Cloudflare, and user auth and databases should be hosted on Supabase. Requirements for this app:

1. It's called "Prompt Scores". Overall, the site design is minimal and attractive, with simple but eye-catching animations and smooth UI/UX that mimics other high-quality sites out there.
2. The home page ("Explore") is where most of the site functionality is. There should be a search bar, and then a grid of prompts that users can vote on. Each prompt has specific Type set by the person who submitted them (such as "System Prompt" or "Chat Setup"). 
3. The search bar should be simple but intelligent, able to pinpoint the types of prompts that the user is looking for without much noise.
4. There are user accounts, so set up a simple sign up and auth flow that uses Supabase. There should be an Account page where the user
5. The Account page should be persistently linked in upper right (logo in the upper left). Next to the Account link, there should be a button that says "Submit Prompt". When clicked, a dialogue box should open up that allows them to submit a prompt, name the prompt, and selected a prelisted "Type" (they can only select one). There should also be a field that allows them to set "tags" that they can put whatever in that will help with search.
6. On the explore page, logged in users should be able to thumbs up prompts that they like. They can remove thumbs up if needed.
7. Below the search bar on the Explore page, there should be an option to filter by Type. The prompt cards should start sorted by amount of votes they have (most to fewest).
