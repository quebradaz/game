#!/bin/sh
# sheet.sh clip.webm out.png [passo_s]  -> grade de quadros a cada passo
f=$1; o=$2; s=${3:-1}
ffmpeg -v error -y -i "$f" -vf "fps=1/$s,scale=384:-1,tile=4x4" -frames:v 1 "$o"
