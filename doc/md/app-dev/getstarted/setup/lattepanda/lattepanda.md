# Run IoT SOL on LattePanda

IoT SOL runs on the LattePanda Board with Windows 10 inside

## Prerequisite
 - LattePanda Board with Windows 10 32bit inside

### Configure Windows
 - **git-bash:** download and install git-bash in [https://git-scm.com/downloads](https://git-scm.com/downloads)
 - **Node.js:** install [Node.js](https://nodejs.org/en/download/) with version >= 0.12.0. 
 
### Flash Firmata 
**NOTE:** Firmata is installed by default in Lattepanda. The step is only needed when the original arduino crashed.

1. Download the `Arduino IDE` from [https://www.arduino.cc/en/Main/Software](https://www.arduino.cc/en/Main/Software)， and then install it in Lattepanda.
2. File -> examples -> Firmata -> standardFirmata
3. Tools -> board -> Arduino Leonardo
4. Tools -> Port -> *the corresponding uart port*
5. Press the `upload` button

You can refer to the [youtube video](https://www.youtube.com/watch?v=h1ztnJnhTmE) for details.
