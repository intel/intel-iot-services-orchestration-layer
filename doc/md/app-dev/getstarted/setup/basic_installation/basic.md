# Download Intel(r) IoT Services Orchestration Layer

Intel IoT SOL (IoT Services Orchestration Layer) is an open source project which locates at [https://github.com/01org/intel-iot-services-orchestration-layer](https://github.com/01org/intel-iot-services-orchestration-layer)

The project is keeping evolving and basically have major releases at quarterly basis and also have minor releases in weekly basis. Please regularly check it to keep updated.

The entry page in the github shows details about how to download and install it. To reiterate it, you may choose one of the following solution:

## Installation Option 1: Download from github

1. Ensure you have Node.js version >0.12 installed

2. Ensure you could use npm (Node.js Package Manager). In case you are behind a firewall / proxy, you might need to configure npm's proxy settings first, for example, running `npm config edit` in your shell (command line prompt) to open npm's configuration file, and configure related proxy items inside it. For example, add these lines in it

```
proxy=http://my_proxy:proxy_port
https-proxy=http://my_proxy:proxy_port
```
Please replace the `my_proxy` and `proxy_port` in above example accordingly.

3. Run following commands to download it from github (git clone or download via web) then install dependant npm packages

NOTE: these lines that start with `#` are comments and no needed to be entered.

```bash
  # Instead of git clone, you may download the zip of project through
  # github webpage and then uncompress it
  git clone https://github.com/01org/intel-iot-services-orchestration-layer iot-sol

  cd iot-sol

  # this would install all dependent npm packages for this
  npm install
```


## Alternative - Installation Option 2: Directly intall from NPM

As this solution is also published in npm with the name `iot-sol`. So instead of installing from github, you may also install it simply with the command below, after you have the step1 and step2 in above option completed as well.

```bash
  npm install iot-sol
  # npm installs it to local node_modules so need cd to it to play with it
  cd node_modules/iot-sol
```

## Post Installation - Read Documentation and Run Demos

Please carefully read the README.md after you finished the installation, it contains a lot of initial steps you may start from, in particular, how to reach more documentation, and how to run the demo applications.