# Our World Of Text setup

**These first few are not required***

1?. Install git with your preferred package installer (Assuming the **apt** package manager)
```bash
    sudo apt update
    sudo apt install git
```
2?. Clone this repo
```bash
    git clone https://github.com/realredtext/nwot-fork.git owot
```
(The **owot** at the end is the directory's name, by default it will be named after the repo you are cloning)

# Optional steps over

1: After switching to the **owot/** directory, run this series of commands:

```bash
    npm install
    node main.js
    node main.js
```
The **node main.js** command is run twice, the first time to set up the ../data/ directory, the 2nd time to add the .sqlite files to it

After running **node main.js** for the 2nd time, you will be prompted to create a superuser (y/n).
This user will be operator by default.

Enter the username, password, and reconfirm the password to create one.

Open up localhost:port, where port is the number the terminal says OWOT is running on

# The original README.md did not mention this, but LOG IN with that superuser name and password, you will not be logged in by default
