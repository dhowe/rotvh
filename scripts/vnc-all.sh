#!/bin/sh

echo Opening SSH tunnels
ssh -N -L localhost:5901:localhost:5900 $SCM1 &
ssh -N -L localhost:5902:localhost:5900 $SCM2 &
ssh -N -L localhost:5903:localhost:5900 $SCM3 &
ssh -N -L localhost:5904:localhost:5900 $SCM4 &
ssh -N -L localhost:5905:localhost:5900 $SCM5 &
ssh -N -L localhost:5906:localhost:5900 $SCM6 &

open vnc://localhost:5901
open vnc://localhost:5902
open vnc://localhost:5903
open vnc://localhost:5904
open vnc://localhost:5905
open vnc://localhost:5906
