import React from 'react';
import {isAppleIOS} from './appleBilling';
import AppleBillingPanel from './AppleBillingPanel';
import GooglePlayBillingPanel from './GooglePlayBillingPanel';
export default function BillingPanel(props){return isAppleIOS()?<AppleBillingPanel {...props}/>:<GooglePlayBillingPanel {...props}/>;}
