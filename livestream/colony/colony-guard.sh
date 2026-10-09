#!/bin/bash
# Lastwächter für den Chat-Colony-Test (root, Cron jede Minute). Kugelrennen und Wortraten haben Vorrang:
# Verliert einer der beiden Bilder (drop_frames steigt um mehr als DROP_MAX pro Minute), sendet er zu langsam
# (speed < 0.97) oder ist die CPU 3 Minuten in Folge über CPU_MAX %, pausiert der Wächter die Colony
# (Datei PAUSE + ffmpeg beenden). Wieder an: rm /var/lib/marble-colony/PAUSE. Werte landen in guard.log.
set -u
C=/var/lib/marble-colony; S=$C/guard.state; LOG=$C/guard.log
DROP_MAX=${DROP_MAX:-30}; CPU_MAX=${CPU_MAX:-88}
[ -d $C ] || exit 0
last(){ tac "$1" 2>/dev/null | grep -m1 "^$2=" | cut -d= -f2; }
read -r _ a b c d e f g _ < /proc/stat; t1=$((a+b+c+d+e+f+g)); i1=$((d+e)); sleep 5
read -r _ a b c d e f g _ < /proc/stat; t2=$((a+b+c+d+e+f+g)); i2=$((d+e))
CPU=$(( 100 - 100*(i2-i1)/(t2-t1) ))
M=$(last /var/lib/marble/progress.txt drop_frames); W=$(last /var/lib/marble-words/progress.txt drop_frames)
MS=$(last /var/lib/marble/progress.txt speed); WS=$(last /var/lib/marble-words/progress.txt speed)
K=$(last $C/progress.txt fps)
PM=0 PW=0 HOT=0; FIRST=0; [ -f $S ] && . $S || FIRST=1
WHY=""
# Erster Lauf: nur Ausgangswerte merken, sonst zählt der Gesamtstand seit Stream-Start als Sprung
if [ "$FIRST" = 1 ]; then printf 'PM=%s PW=%s HOT=0\n' "${M:-0}" "${W:-0}" > $S; exit 0; fi
# Stream neu gestartet (Zähler kleiner als vorher): Basis neu setzen
[ -n "$M" ] && [ "$M" -lt "$PM" ] && PM=$M; [ -n "$W" ] && [ "$W" -lt "$PW" ] && PW=$W
[ -n "$M" ] && [ "$M" -ge "$PM" ] && [ $((M-PM)) -gt $DROP_MAX ] && WHY="Kugelrennen verliert Bilder (+$((M-PM)))"
[ -n "$W" ] && [ "$W" -ge "$PW" ] && [ $((W-PW)) -gt $DROP_MAX ] && WHY="Wortraten verliert Bilder (+$((W-PW)))"
for s in "${MS%x}" "${WS%x}"; do [ -n "$s" ] && awk "BEGIN{exit !($s>0 && $s<0.97)}" && WHY="Encoder zu langsam (speed $s)"; done
[ "$CPU" -gt "$CPU_MAX" ] && HOT=$((HOT+1)) || HOT=0
[ "$HOT" -ge 3 ] && WHY="CPU $CPU % seit 3 Min."
printf 'PM=%s PW=%s HOT=%s\n' "${M:-0}" "${W:-0}" "$HOT" > $S
echo "$(date -u +%FT%TZ) cpu=$CPU marble_drop=${M:--} words_drop=${W:--} speed=${MS:--}/${WS:--} colony_fps=${K:--}${WHY:+ PAUSE: $WHY}" >> $LOG
tail -n 3000 $LOG > $LOG.tmp && mv $LOG.tmp $LOG
if [ -n "$WHY" ] && [ ! -f $C/PAUSE ] && [ ! -f $C/NOGUARD ]; then
  echo "$WHY" > $C/PAUSE; chown colony:colony $C/PAUSE 2>/dev/null
  [ -f $C/ffmpeg.pid ] && kill "$(cat $C/ffmpeg.pid)" 2>/dev/null
fi
exit 0
