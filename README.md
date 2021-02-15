Parses MacOS Keychain dump and exports it as a Bitwarden compatible JSON.

# Applescript automation

You will be asked to enter the keychain password for each item, but you can automate this process using AppleScript.

Start "Script editor" app on your Mac and paste the following:

```applescript
set keychainPassword to "<YOUR_PASSWORD_HERE>"

tell application "System Events"
	repeat while exists (processes where name is "SecurityAgent")
		tell process "SecurityAgent"
			set value of text field 1 of window 1 to keychainPassword
			click button "Allow" of window 1
		end tell
		delay 0.2
	end repeat
end tell
```

This will type your password and press "Allow" for each exported item.

# Security settings

You need to give this script permissions to control your computer. Feel free to revoke them as soon as the execution completes.

Go to System Preferences -> Security & Privacy -> Privacy tab -> Accessibility and add Script Editor to the list, making sure the checkbox next to it is checked.

# Export keychain to a file

```bash
security dump-keychain -d login.keychain > keychain.txt
```

# Run the script

```bash
node parse.js keychain.txt > keychain.json
```

Import the generated JSON into Bitwarden.
