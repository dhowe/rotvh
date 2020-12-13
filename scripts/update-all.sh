#!/bin/sh

echo Updating $SCM1
ssh $SCM1 "cd /Library/WebServer/Documents/autochar && git pull"
echo Updating $SCM2
ssh $SCM2 "cd /Library/WebServer/Documents/autochar && git pull"
echo Updating $SCM3
ssh $SCM3 "cd /Library/WebServer/Documents/autochar && git pull"
echo Updating $SCM4
ssh $SCM4 "cd /Library/WebServer/Documents/autochar && git pull"
echo Updating $SCM5
ssh $SCM5 "cd /Library/WebServer/Documents/autochar && git pull"
echo Updating $SCM6
ssh $SCM6 "cd /Library/WebServer/Documents/autochar && git pull"
