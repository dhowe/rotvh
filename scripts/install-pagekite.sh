#!/bin/sh

wget --no-check-certificate http://pagekite.net/pk/pagekite.py
chmod +x pagekite.py
sudo chown root:wheel pagekite.py
mv pagekite.py /usr/local/bin/pagekite.py

mkdir /etc/pagekite/
mv pagekite.rc /etc/pagekite/pagekite.rc

#Now add pagekite.py as a launchctl service, pointing it to the options file:

# $ cp scripts/pagekite.plist /Library/LaunchDaemons/pagekite.service.plist (or below)
# $ sudo launchctl load /Library/LaunchDaemons/pagekite.service.plist

#<?xml version="1.0" encoding="UTF-8"?>
#<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" \
#"http://www.apple.com/DTDs/PropertyList-1.0.dtd">
#<plist version="1.0">
#<dict>
#<key>Label</key>
#<string>pagekite.service</string>
#
#<key>ProgramArguments</key>
#<array>
#<string>/usr/local/bin/pagekite.py</string>
#<string>--optfile=/etc/pagekite/pagekite.rc</string>
#</array>
#
#<key>KeepAlive</key>
#<true/>
#
#<key>RunAtLoad</key>
#<true/>
#</dict>
#</plist>
