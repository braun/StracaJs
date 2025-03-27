import { HPANELSB, VCONT, VPANEL } from "hejl/base/containers";
import { AuthenticationProvider, AuthenticationProviderBattery } from "./provider";
import { PLAINLAYOUT } from "hejl/topnest/plainlayout";
import { IMG } from "hejl/base/image";
import { H3T, STRONGT } from "hejl/base/hejlHtmlTags";

export function createAuthPanel(bat:AuthenticationProviderBattery)
{
    const layout = VCONT('authlistpanel')
    .collection(()=>bat.providers,(p:AuthenticationProvider)=>p.renderAuthButton())

    return layout;
}


export function createAuthView(title:string, bat:AuthenticationProviderBattery)
{
    const layout = PLAINLAYOUT('authlistview')
        .header(HPANELSB().stack([
            IMG('logo').srcbinder(()=>"resources/logo.svg"),H3T(title)
            ]))
        .content(
            VCONT('authpanel').stack([
                VCONT('authcard').class('card')
                    .stack([
                        STRONGT('Continue with:'),createAuthPanel(bat)])
            ]));

        return layout;
}
