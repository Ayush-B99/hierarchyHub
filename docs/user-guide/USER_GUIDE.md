# User Guide

This guide shows how to use Hierarchy Hub. The screenshots use sample employees. It is an outline for now. Each section is filled in, with screenshots, as the feature is built.

Live app: _link added after deployment_

## 1. Getting started

Open the app in a current browser. There are two main pages, which you switch between with the tabs in the top bar:

- **Explore** shows the organisation one person at a time.
- **People** lists everyone in a table.

The round button on the right of the top bar switches between light and dark mode. The app remembers your choice.

![Explore in dark mode](images/dark-mode.jpg)

## 2. Adding an employee

1. Select **Add employee** in the top bar.
2. Fill in the first name, surname, email, employee number, birth date, role and salary. Every field is needed.
3. Under **Reports to**, pick their manager. Leave it as **No manager** only for someone at the very top, like the CEO.
4. Select **Add employee**.

If something is missing or doesn't look right, a short message appears under that field and the cursor jumps to the first one to fix. Employee numbers and email addresses must be unique, so you'll be told if someone already has them.

When the employee is saved, a confirmation appears at the bottom of the screen and the Explore page opens on the new person, so you can see where they sit.

![The add employee form](images/add-employee.jpg)

## 3. Viewing and editing an employee

Open someone on the Explore page (or click their name on the People page) to see all their details in the panel on the right.

To change anything, select **Edit details**, update the fields and select **Save changes**. Press **Cancel** or the Escape key to close without saving.

## 4. Changing someone's manager

Open the person on the Explore page and select **Change manager**. The form opens with **Reports to** ready to change.

Some people are greyed out in the list and can't be picked:

- the person themselves, because nobody can be their own manager
- anyone in their team, at any level below them, because that would create a reporting loop

Pick the new manager and select **Save changes**. The org chart updates straight away.

![Changing a manager, with the Reports to list ready](images/change-manager.jpg)

### Dragging instead

With a mouse, you can also drag someone in the Orbit view onto their new manager:

1. Press and hold on a person's card and start moving.
2. Cards you can drop on get a dashed outline. Cards you can't (the person's own team, or their current manager) fade out.
3. Let go over the new manager. The card under the pointer gets a solid outline and the label says "Move ... here".
4. Confirm with **Move**, or press **Cancel**. Nothing changes until you confirm.

Press Escape while dragging to stop. On touch screens, use **Change manager** instead, so swiping still scrolls the page.

![Dragging Naledi onto Johan](images/drag-to-move.jpg)

## 5. Deleting an employee

Open the person on the Explore page and select **Delete**.

Before anything happens, a message tells you exactly who will be affected. For example: "4 people report to Johan. They'll move to Sipho Dlamini." The people who reported to the deleted employee move up to the deleted employee's own manager, so nobody is left without one.

Select **Delete employee** to confirm, or **Cancel** to keep them. **Cancel** is selected by default so a stray key press can't delete anyone. This can't be undone.

![The delete confirmation, explaining who will move](images/delete.jpg)

## 6. Exploring the organisation

The Explore page always focuses on one person. When you first open it, that's the person at the top of the organisation, usually the CEO.

### Orbit view

The selected person sits in the middle. Their manager is above them and the people who report to them are spread out below.

- **Click anyone** to move to them. They become the person in the middle.
- Each card shows how many people report to that person, or "No team".
- If someone has a very large team, the last card says **+N more**. Click it to see everyone in the Levels view.

![Orbit view, with Johan in the middle, Sipho above and his team below](images/explore-orbit.jpg)

### Levels view

Click the **Levels** button in the top card to switch views. Each column is one level of the organisation, starting with the top. The columns follow the path down to the selected person, who is highlighted. Click anyone to select them and open their team in the next column.

![Levels view, one column per level of the organisation](images/explore-levels.jpg)

### Path to the top

In the Orbit view, the panel on the left lists everyone between the selected person and the top of the organisation. Click any of them to jump straight there.

### Details

The panel on the right shows the selected person's details:

- three numbers: their direct reports, everyone in their whole team, and how many levels they are below the top
- their employee number, salary, birth date, manager and email
- **Works alongside**: other people with the same manager. Click one to jump to them.

The **Edit details**, **Change manager** and **Delete** buttons at the bottom of this panel are explained in sections 3 to 5.

### Finding someone

Use the **Find someone** box in the top bar, on any page. Type part of a name, employee number, email or role and matching people appear as you type, with the matching letters underlined.

- Click a person, or use the arrow keys and press Enter, to open them.
- Press **/** (or **Cmd + K** on a Mac, **Ctrl + K** on Windows) from anywhere to jump to the search box.
- Press Escape to clear the search.

![Searching for "na"](images/search.jpg)

### Sharing and going back

The selected person and view are saved in the address bar, so:

- the browser's back button takes you to the person you were looking at before
- you can copy the address and send it to someone to show them a specific person

## 7. Using the People page

The People page lists everyone in a table, 10 people at a time.

### Filtering with the sentence

At the top is a sentence: _Show people in **any role**, earning **any salary**, born **in any year** and reporting to **anyone**._

Each word in a pill is a dropdown. Click one and pick an option to filter the table, for example "Software Engineer" or "over R 50 000". Pills that are filtering the table turn solid so you can see what's applied. **Clear filters** puts everything back.

### Searching

Type in the search box to find people by name, surname, email or employee number. The table updates as you type.

### Sorting

Click any column heading to sort by it. Click it again to reverse the order. The arrow next to the heading shows which column is sorted and in which direction. **Reports to** sorts by the manager's surname, with people who have no manager first.

### Pages

Below the table you'll see how many people match, for example "Showing 1 to 10 of 14 people". Use **Previous** and **Next** to move between pages.

### Opening someone

Click a person's name, or anywhere on their row, to open them on the Explore page.

### Exporting

**Export CSV** downloads everyone who matches the current filters, not just the page you can see. The file opens in Excel, Google Sheets or Numbers.

### Sharing a view

Your filters, sort and page are saved in the address bar. Copy the address to bookmark a view or send it to someone.

![The People page with the sentence filters and table](images/people.jpg)

## 8. Profile pictures

Profile pictures come from [Gravatar](https://gravatar.com), a free service that links a picture to an email address. Hierarchy Hub looks up each employee's picture using the email in their record.

- If the employee has a Gravatar picture, it shows on their cards, in the table and in search results.
- If they don't, a soft circle with their initials is shown instead.

To change a picture, the employee signs in to gravatar.com with the same email address and uploads a new one. It appears in Hierarchy Hub automatically, usually within a few minutes. If you change an employee's email in Hierarchy Hub, their picture changes to the one linked to the new address.

For privacy, the email address is turned into a code (a hash) in your browser before it's sent to Gravatar, so Gravatar never sees the address itself.

## 9. Troubleshooting

| What you see                                                 | What to do                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| "We couldn't load the organisation"                          | Check your connection and select **Try again**.                                                    |
| "Another employee already has that email or employee number" | Use a different value, or search for the existing person and edit them instead.                    |
| A person is greyed out in **Reports to**                     | They're the person you're editing or in their team. Picking them would create a reporting loop.    |
| A picture shows initials instead of a photo                  | That email has no Gravatar picture yet. See section 8.                                             |
| "We couldn't find that person"                               | The link points to someone who has been deleted. You're shown the top of the organisation instead. |

## 10. Extra features

These go beyond what the brief asked for:

| Feature                                         | Where                         |
| ----------------------------------------------- | ----------------------------- |
| Two ways to explore: Orbit and Levels           | Explore page, section 6       |
| Path to the top and "Works alongside"           | Explore page, section 6       |
| Drag a person onto a new manager                | Orbit view, section 4         |
| Search from any page, with keyboard shortcuts   | Top bar, section 6            |
| Filters written as a sentence                   | People page, section 7        |
| Export to CSV                                   | People page, section 7        |
| Shareable links for any person or filtered view | Address bar, sections 6 and 7 |
| Light and dark mode                             | Top bar, section 1            |
| Works on phones and tablets                     | Everywhere                    |
| Keyboard and screen reader support              | Everywhere                    |
