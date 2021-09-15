import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import FilledInput from '@material-ui/core/FilledInput';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import Web3 from 'web3';
import detectEthereumProvider from '@metamask/detect-provider';
import FundraiserContract from "./contracts/Fundraiser.json";

const cc = require('cryptocompare');

const useStyles = makeStyles(theme => ({
  card: {
    maxWidth: 450,
    height: 400,
  },
  media: {
    height: 140,
  },
  button: {
    margin: theme.spacing(1),
  },
  input: {
    display: 'none',
  },
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  formControl: {
    margin: theme.spacing(1),
    display: 'table-cell',
  },
  paper: {
    position: 'absolute',
    width: 400,
    backgroundColor: theme.palette.background.paper,
    border: 'none',
    boxShadow: 'none',
    padding: 4,
  },
}));

const FundraiserCard = (props) => {
  const classes = useStyles();

  const [ web3, setWeb3 ] = useState(null);
  const [ contract, setContract ] = useState(null);
  const [ accounts, setAccounts ] = useState(null);
  const [ fundName, setFundname ] = useState(null);
  const [ description, setDescription ] = useState(null);
  const [ totalDonations, setTotalDonations ] = useState(null);
  const [ donationCount, setDonationCount ] = useState(null);
  const [ imageURL, setImageURL ] = useState(null);
  const [ url, setURL ] = useState(null);
  const [ open, setOpen ] = useState(false);
  const [ donationAmount, setDonationAmount ] = useState(null);
  const [ exchangeRate, setExchangeRate ] = useState(null);
  const [ userDonations, setUserDonations ] = useState(null);

  const ethAmount = donationAmount / exchangeRate || 0;
  const { fundraiser } = props;

  useEffect(() => {
    if (fundraiser) {
      init(fundraiser);
    }
  },[fundraiser]);

  const init = async (fundraiser) => {
    try {
      const fund = fundraiser;
      const provider = await detectEthereumProvider();
      const web3 = new Web3(provider);
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = FundraiserContract.networks[networkId];
      const accounts = await web3.eth.getAccounts();
      const instance = new web3.eth.Contract(
        FundraiserContract.abi,
        fund
      );
      setWeb3(web3);
      setContract(instance);
      setAccounts(accounts);

      const name = await instance.methods.name().call();
      const description = await instance.methods.description().call();
      const totalDonations = await instance.methods.totalDonations().call();
      const imageURL = await instance.methods.imageURL().call();
      const url = await instance.methods.url().call();

      const exchangeRate = await cc.price('ETH', ['USD']);
      setExchangeRate(exchangeRate.USD);
      const eth = web3.utils.fromWei(totalDonations, 'ether');
      const dollerDonationAmount = exchangeRate.USD * eth;

      setFundname(name);
      setDescription(description);
      setImageURL(imageURL);
      setTotalDonations(dollerDonationAmount);
      setURL(url);
      const userDonations = await instance.methods.myDonations().call({from: accounts[0]});
      console.log(userDonations);
      setUserDonations(userDonations);
    } catch(error) {
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  }

  const handleOpen = () => {
    setOpen(true);
  }

  const handleClose = () => {
    setOpen(false);
  }

  const submitFunds = async () => {
    const ethTotal = donationAmount / exchangeRate;
    const donation = web3.utils.toWei(ethTotal.toString());

    const currentUser = await web3.currentProvider.selectedAddress;

    await contract.methods.donate().send({
      from: currentUser,
      value: donation,
      gas: 650000
    });
    setOpen(false);
  }

  const renderDonationList = () => {
    var donations = userDonations;
    if (donations === null) { return null; }

    const totalDonations = donations.values.length;
    let donationList = [];
    var i;
    for (i = 0; i < totalDonations; i++) {
      const ethAmount = web3.utils.fromWei(donations.values[i]);
      const userDonation = exchangeRate * ethAmount;
      const donationDate = donations.dates[i];
      donationList.push({ donationAmount: userDonation.toFixed(2), date: donationDate });
    }

    return donationList.map((donation) => {
      return (
        <div className="donation-list">
          <p>${donation.donationAmount}</p>
          <Button variant="contained" color="primary">
            <Link
              className="donation-receipt-link"
              to={{
                pathname: '/receipts',
                state: {
                  fund: fundName,
                  donation: donation.donationAmount,
                  date: donation.date
                }
              }}
            >
              Request Receipt
            </Link>
          </Button>
        </div>
      );
    });
  }

  return (
    <div className="fundraiser-card-container">
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">Donate to {fundName}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <img src={imageURL} width='200px' height='130px' />
            <p>{description}</p>
          </DialogContentText>
        </DialogContent>
        <FormControl className={classes.formControl}>
          $
          <input
            id="component-simple"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            placeholder="0.00"
          />
        </FormControl>
        <p>Eth: {ethAmount}</p>

        <Button onClick={submitFunds} variant="contained" color="primary">
          Donate
        </Button>
        <div>
          <h3>My Donations</h3>
          {renderDonationList()}
        </div>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      <Card className={classes.card} onClick={handleOpen}>
        <CardActionArea>
          <CardMedia
            className={classes.media}
            image={imageURL}
            title="Fundraiser Image"
          />
          <CardContent>
            <Typography gutterBottom variant="h5" component="h2">
              {fundName}
            </Typography>
            <Typography variant="body2" color="textSecondary" component="p">
              <p>{description}</p>
              <p>Total Donations: ${totalDonations}</p>
            </Typography>
          </CardContent>
        </CardActionArea>
        <CardActions>
          <Button
            onClick={handleOpen}
            variant="contained"
            className={classes.button}
          >
            View More
          </Button>
        </CardActions>
      </Card>
    </div>
  );
}

export default FundraiserCard;
