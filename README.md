# Attendance Compiler for MS Teams

## Why
The generated attendance CSV from a Microsoft Teams meeting only provides a log of the joining and leaving timestamps for the participants.  
&nbsp;  
For a classroom setting, however, it is often required to track a student's attendance duration, as well as their time-of-entry into the classroom, in order to determine whether credit for attendance should be given or not.  
&nbsp;  
Similar use-cases may exist beyond the classroom.

## Usage
1. From Microsoft Teams meetings, download the attendance CSV files from the Participants sidebar
2. Visit [this project's website](https://dhdhagar.github.io/msteams-attendance-compiler/), and set the configuration parameters - start time, end time, the minimum minutes required for attendance, and, optionally, the list of names of the attendees as a single-column CSV with column name 'Names'
3. Click to upload one or more attendance CSV files
4. The aggregated attendance files will then get downloaded automatically
5. If the list of names is provided, an aggregated attendance file is additionally generated, which contains values for attendees across dates
