# Example Configs

This directory contains installers for popular color palettes.
To install a given palette, copy the install file locally and run it.
For example, to add Tailwind colors to your color config:

    ./example-config/tailwind.sh

Each script supports a PREFIX environment variable to set a prefix:

    PREFIX=tailwind: ./example-config/tailwind.sh

Use `grep` and `awk` to delete. Example:

    for k in $(color config list | grep tailwind: | awk '{print $1}'); do color config delete $k; done
