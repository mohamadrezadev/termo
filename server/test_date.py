#!/usr/bin/env python3
"""Test Jalali date conversion"""

import jdatetime
from datetime import datetime

now = datetime.utcnow()
j_date = jdatetime.datetime.fromgregorian(datetime=now)

print("=" * 50)
print("Date Conversion Test")
print("=" * 50)
print(f"Gregorian (Miladi): {now.strftime('%Y-%m-%d')}")
print(f"Jalali (Shamsi):    {j_date.strftime('%Y/%m/%d')}")
print("=" * 50)
