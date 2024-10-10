#!/bin/sh

cd /home/pi/EPGStation
npm run backup /srv/dev-disk-by-uuid-A6DA96A3DA966F75/NAS/EPG-Backup/EPGStation-`date '+%Y-%m%d'`
